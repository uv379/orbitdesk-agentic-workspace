/**
 * rate-limit.middleware.ts — Prevents any single user/IP from flooding the API.
 *
 * Why rate limiting?
 * Without it, one bad actor (or a bug in the frontend) can send thousands of
 * requests per second, crashing downstream services for everyone else.
 *
 * Strategy:
 *   - Sliding window: count requests in the last N milliseconds
 *   - Key: user ID if authenticated, IP address as fallback
 *   - Using user ID (not just IP) prevents users from bypassing limits by
 *     switching IPs (e.g. VPN rotation)
 *   - Default: 100 requests per 60 seconds
 *
 * Current implementation: in-memory Map.
 * ⚠️  Production note: This only works for a single gateway instance.
 *     If you run 3 gateway containers, each has its own Map — so a user
 *     could send 100 × 3 = 300 requests before hitting any limit.
 *     In production, replace the Map with Redis (use the `ioredis` package)
 *     so all instances share the same counter.
 *
 * HTTP 429 Too Many Requests is the standard response code for rate limiting.
 * The Retry-After header tells the client when they can try again.
 */

import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response, NextFunction } from 'express'

// Stores the state for each rate-limited key (user ID or IP).
interface RateLimitRecord {
  count: number      // how many requests have been made in the current window
  windowStart: number // when the current window started (Unix timestamp in ms)
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  // In-memory store: key → { count, windowStart }
  // Map is used instead of a plain object because it has O(1) get/set
  // and doesn't inherit prototype properties from Object.
  private readonly store = new Map<string, RateLimitRecord>()

  private readonly windowMs: number  // e.g. 60000 (1 minute)
  private readonly max: number       // e.g. 100 (max requests per window)

  constructor(private readonly config: ConfigService) {
    this.windowMs = this.config.get<number>('rateLimit.windowMs')
    this.max = this.config.get<number>('rateLimit.max')
  }

  /**
   * use() runs on every request after AuthMiddleware has already verified the token.
   * By this point, req.user is set (if authenticated), so we can key by user ID.
   */
  use(req: Request, res: Response, next: NextFunction) {
    // Prefer user ID as the rate-limit key — it's more reliable than IP because:
    // - Multiple users behind a corporate NAT share the same IP
    // - Authenticated users can't bypass limits by switching IPs
    // Fall back to IP for unauthenticated requests (shouldn't happen on /api/* but just in case).
    const key = req.user?.sub ?? this.getClientIp(req)

    const now = Date.now()
    const record = this.store.get(key)

    if (!record || now - record.windowStart >= this.windowMs) {
      // No record exists yet, OR the previous window has expired — start a fresh window.
      this.store.set(key, { count: 1, windowStart: now })
      return next() // First request in a new window always passes.
    }

    // We're within an active window. Increment and check against the limit.
    record.count++

    if (record.count > this.max) {
      // Over the limit. Calculate how many seconds until their window resets.
      const retryAfterSeconds = Math.ceil((record.windowStart + this.windowMs - now) / 1000)

      // Set Retry-After header so well-behaved clients know when to retry.
      res.setHeader('Retry-After', retryAfterSeconds)

      // HTTP 429 = Too Many Requests
      throw new HttpException(
        `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    // Under the limit — let the request through.
    next()
  }

  /**
   * getClientIp() extracts the real client IP from the request.
   *
   * req.ip is set by Express, but if the gateway sits behind a load balancer
   * or reverse proxy (Nginx, AWS ALB), the real client IP is in X-Forwarded-For.
   * X-Forwarded-For can be a comma-separated list when multiple proxies are involved:
   * "client-ip, proxy1-ip, proxy2-ip" — the first entry is always the real client.
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim()
    }
    return req.ip || 'unknown'
  }
}
