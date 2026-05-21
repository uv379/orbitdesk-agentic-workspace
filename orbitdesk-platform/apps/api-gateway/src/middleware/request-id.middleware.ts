/**
 * request-id.middleware.ts — Stamps every request with a unique trace ID.
 *
 * Why do we need a trace ID?
 * A single user action (e.g. "send a chat message") triggers a chain of calls:
 *   Browser → Gateway → ai-core-service → agent-service → ...
 * If something goes wrong, you need to find ALL the log lines from ALL services
 * that belong to that one request. Without a shared ID, it's nearly impossible.
 *
 * How it works:
 *   1. When a request arrives, check if the client already sent an X-Trace-Id header.
 *      (Some load balancers or API clients set this themselves.)
 *   2. If not, generate a new UUID.
 *   3. Attach the ID to the request headers — downstream services will receive it
 *      when the ProxyService forwards the request.
 *   4. Also set it on the response headers — the frontend/developer can read it
 *      from the browser's network tab to look up server logs.
 *
 * Middleware in NestJS:
 * - Implements NestMiddleware interface
 * - Has a use(req, res, next) method — just like Express middleware
 * - MUST call next() to pass control to the next middleware or route handler.
 *   If you forget next(), the request just hangs forever.
 */

import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  /**
   * use() is called on every request that matches the routes in app.module.ts.
   *
   * @param req  - The incoming HTTP request object
   * @param res  - The outgoing HTTP response object
   * @param next - Call this to hand off to the next middleware in the chain
   */
  use(req: Request, res: Response, next: NextFunction) {
    // Use the incoming X-Trace-Id if the caller already provided one,
    // otherwise generate a new UUID (e.g. "a7f3c2d1-8b4e-4f2a-9c1d-3e5f7a8b2c4d").
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4()

    // Write the trace ID into the request headers so downstream services receive it.
    // When ProxyService forwards the request, these headers go with it.
    req.headers['x-trace-id'] = traceId

    // Also set it on the response so the browser can see it in the Network tab.
    // This helps developers match a failing API call to a specific trace in logs.
    res.setHeader('X-Trace-Id', traceId)

    // Hand off to the next middleware (AuthMiddleware, then RateLimitMiddleware).
    next()
  }
}
