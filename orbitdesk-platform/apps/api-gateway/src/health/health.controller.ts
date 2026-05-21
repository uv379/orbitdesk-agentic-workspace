/**
 * health.controller.ts — Liveness and readiness probes for the gateway.
 *
 * Why do we need health endpoints?
 * Docker, Kubernetes, and load balancers need to know if this service is alive
 * and ready to handle traffic. They poll these endpoints automatically.
 *
 * Two different endpoints, two different purposes:
 *
 * GET /health/live  — "Is the process alive?"
 *   Returns 200 as long as the Node.js process is running.
 *   If this returns non-200, Docker/Kubernetes restarts the container.
 *   Never does deep checks here — if the process can respond, it's alive.
 *
 * GET /health/ready — "Is the service ready to handle real traffic?"
 *   Returns 200 only if downstream services are reachable.
 *   If this returns non-200, the load balancer stops sending traffic here
 *   but does NOT restart the container (it might recover on its own).
 *   Use case: during startup, the gateway process is alive but auth-service
 *   might not be ready yet — readiness fails until everything is up.
 *
 * These routes are excluded from AuthMiddleware in app.module.ts, so they
 * work without any JWT token. This is correct — health checks must be public.
 *
 * NestJS Controller basics:
 * @Controller('health') → base path is /health
 * @Get('live')          → full path is GET /health/live
 * @Get('ready')         → full path is GET /health/ready
 * No @Res() needed here — we just return a plain object and NestJS serializes
 * it to JSON automatically. Much simpler than the proxy controller.
 */

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  /**
   * live() — Simple liveness check.
   * If this method runs, the process is alive. Always returns 200.
   * NestJS serializes the returned object to JSON automatically.
   */
  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * ready() — Readiness check that pings critical downstream services.
   *
   * We ping auth-service because it's the most critical — if auth is down,
   * no authenticated request can succeed anyway. Adjust the list based on
   * which services your gateway considers "must be up to serve traffic."
   *
   * Returns 200 with all service statuses if everything is reachable.
   * Returns 503 Service Unavailable if any critical service is unreachable.
   */
  @Get('ready')
  async ready() {
    const services = this.config.get<Record<string, string>>('services')

    // Check the two most critical services: auth and ai-core.
    // Each check is a simple GET to /health/live on the downstream service.
    // We run them in parallel with Promise.allSettled so one failure doesn't
    // block the others (allSettled never rejects, unlike Promise.all).
    const checks = await Promise.allSettled([
      this.ping('auth', services.auth),
      this.ping('ai-core', services.chat),
    ])

    // Build a status report for each service
    const results: Record<string, string> = {}
    checks.forEach((result, index) => {
      const name = index === 0 ? 'auth' : 'ai-core'
      results[name] = result.status === 'fulfilled' ? 'up' : 'down'
    })

    // If any critical service is down, return 503 so the load balancer knows
    // not to route traffic here. Include the detailed results so operators can
    // see which service caused the failure.
    const anyDown = Object.values(results).some(status => status === 'down')
    if (anyDown) {
      throw new HttpException(
        { status: 'degraded', services: results },
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      services: results,
    }
  }

  /**
   * ping() sends a GET request to a downstream service's /health/live endpoint.
   * Resolves if the service responds with any 2xx status.
   * Rejects if the service is unreachable or returns a non-2xx status.
   *
   * @param name    - Human-readable name (used only for logging)
   * @param baseUrl - The base URL of the downstream service
   */
  private async ping(name: string, baseUrl: string): Promise<void> {
    try {
      await axios.get(`${baseUrl}/health/live`, { timeout: 3000 })
    } catch {
      throw new Error(`${name} is unreachable`)
    }
  }
}
