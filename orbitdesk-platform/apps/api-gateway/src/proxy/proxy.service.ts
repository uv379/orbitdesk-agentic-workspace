/**
 * proxy.service.ts — The core forwarding logic of the API Gateway.
 *
 * This service does the actual work of proxying requests:
 *   1. Receive the incoming request from ProxyController
 *   2. Look up which downstream service handles this path (using routes.config.ts)
 *   3. Strip the /api/<service> prefix and build the downstream URL
 *   4. Forward the request with the same method, headers, and body
 *   5. Return the downstream response (status code + body) to the client
 *
 * Example flow:
 *   Client sends:  POST /api/chat/conversations/123/messages  { "content": "Hello" }
 *   Gateway looks: "chat" → http://ai-core-service:3004
 *   Forwards to:   POST http://ai-core-service:3004/conversations/123/messages
 *   Returns:       whatever ai-core-service responds with
 *
 * What headers does the gateway forward?
 *   ✅ x-trace-id     — set by RequestIdMiddleware, used for distributed tracing
 *   ✅ x-user-id      — set by AuthMiddleware (the verified user's ID)
 *   ✅ x-user-role    — set by AuthMiddleware
 *   ✅ x-workspace-id — set by AuthMiddleware
 *   ✅ content-type   — so downstream knows if it's JSON, multipart, etc.
 *   ❌ host           — must be stripped (it's the gateway's host, not the service's)
 *   ❌ authorization  — downstream services don't need the raw JWT token;
 *                       they trust x-user-id set by the gateway instead
 *
 * NestJS Services:
 * - A Service is just a class decorated with @Injectable()
 * - It holds reusable business logic (in this case, HTTP forwarding)
 * - NestJS creates one instance and injects it wherever it's needed (DI pattern)
 */

import { Injectable, NotFoundException, BadGatewayException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { Request, Response } from 'express'
import { AxiosError } from 'axios'
import { getRoutes, ServiceRoutes } from './routes.config'

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name)
  private readonly routes: ServiceRoutes

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    // Build the routing table once at startup using the resolved service URLs.
    // getRoutes() reads the 'services' namespace from our configuration.ts.
    const services = this.config.get<Record<string, string>>('services')
    this.routes = getRoutes(services)
  }

  /**
   * forward() is the main method called by ProxyController for every request.
   * It reads the incoming request, determines the target, and sends it onward.
   *
   * @param req - The original incoming HTTP request from the client
   * @param res - The HTTP response object we use to send the result back
   */
  async forward(req: Request, res: Response): Promise<void> {
    // req.url for a request to /api/chat/conversations looks like "/api/chat/conversations"
    // We split it into segments: ['api', 'chat', 'conversations']
    const segments = req.url.split('/').filter(Boolean)

    // segments[0] = 'api'   (the base prefix)
    // segments[1] = 'chat'  (the service key — must exist in our routes map)
    const serviceKey = segments[1]

    const targetBaseUrl = this.routes[serviceKey]
    if (!targetBaseUrl) {
      // No service registered for this prefix — return 404 immediately.
      throw new NotFoundException(`No service registered for /api/${serviceKey}`)
    }

    // Build the downstream path by stripping /api/<serviceKey> from the URL.
    // /api/chat/conversations/123 → /conversations/123
    // If nothing remains after stripping, default to '/'.
    const downstreamPath = '/' + segments.slice(2).join('/')

    // Preserve query string if present (e.g. /api/agents?status=running → ?status=running)
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const downstreamUrl = `${targetBaseUrl}${downstreamPath}${queryString}`

    this.logger.debug(`[${req.headers['x-trace-id']}] ${req.method} ${req.url} → ${downstreamUrl}`)

    // Build the headers to forward downstream.
    // We spread all incoming headers and then selectively remove sensitive ones.
    const forwardHeaders: Record<string, string> = {}

    // Copy safe headers from the incoming request
    const allowedHeaders = [
      'content-type',
      'accept',
      'x-trace-id',
      'x-user-id',
      'x-user-role',
      'x-workspace-id',
    ]
    for (const header of allowedHeaders) {
      const value = req.headers[header]
      if (value) {
        forwardHeaders[header] = Array.isArray(value) ? value[0] : value
      }
    }

    try {
      // Use Axios (via HttpService.axiosRef) to make the downstream request.
      // axiosRef gives us the raw Axios instance for full control.
      const response = await this.httpService.axiosRef({
        method: req.method as any,
        url: downstreamUrl,
        headers: forwardHeaders,
        // req.body is populated by Express's built-in JSON body parser (configured in main.ts).
        // We only send a body for methods that support it (POST, PUT, PATCH).
        data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
        // 30 second timeout. If a downstream service doesn't respond in time,
        // Axios throws a timeout error which we catch below and return as 504.
        timeout: 30_000,
        // Don't throw on non-2xx status codes from downstream — we want to
        // forward the downstream error response as-is to the client.
        validateStatus: () => true,
      })

      // Mirror any useful response headers from the downstream service back to the client.
      // (e.g. content-type so the browser knows it received JSON)
      const responseHeaders = response.headers
      if (responseHeaders['content-type']) {
        res.setHeader('Content-Type', responseHeaders['content-type'])
      }

      // Send the downstream status code and body back to the original client.
      res.status(response.status).json(response.data)
    } catch (err) {
      // This catch block handles network-level errors (not HTTP error responses).
      // Examples: downstream service is down, DNS failure, request timeout.
      const axiosErr = err as AxiosError
      this.logger.error(
        `[${req.headers['x-trace-id']}] Downstream error for ${downstreamUrl}: ${axiosErr.message}`,
      )

      if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
        // 504 Gateway Timeout — downstream took too long to respond
        throw new BadGatewayException(`Service ${serviceKey} timed out`)
      }

      // 502 Bad Gateway — downstream is unreachable (crashed, not running, network issue)
      throw new BadGatewayException(`Service ${serviceKey} is unavailable`)
    }
  }
}
