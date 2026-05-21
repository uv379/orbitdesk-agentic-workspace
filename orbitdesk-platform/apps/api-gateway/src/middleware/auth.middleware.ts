/**
 * auth.middleware.ts — Validates the JWT token on every protected request.
 *
 * What is a JWT?
 * JSON Web Token — a signed string that auth-service creates when a user logs in.
 * It looks like: "eyJhbGci...header.eyJ1c2VyI...payload.signature"
 * The payload contains user info (userId, email, role). The signature proves
 * the token was created by auth-service and hasn't been tampered with.
 *
 * What this middleware does:
 *   1. Reads the Authorization header: "Bearer <token>"
 *   2. Extracts the token
 *   3. Verifies it with the same secret auth-service used to sign it
 *   4. If valid: attaches decoded user data to req.user and adds x-user-id header
 *      so downstream services know who made the request (without re-checking the token).
 *   5. If invalid or missing: throws 401 Unauthorized
 *
 * Why middleware and not a Guard?
 * NestJS Guards also do auth, but they run AFTER middleware. For a gateway pattern
 * where we want to authenticate at the very edge (before routing logic), middleware
 * is the right choice. Guards are better for controller-level auth in individual services.
 *
 * Public routes (login, register) are excluded in app.module.ts via .exclude(),
 * so this middleware never runs for those routes.
 */

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

// Extend Express's Request type so TypeScript knows req.user exists.
// Without this, TypeScript would complain that 'user' is not a property of Request.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// The shape of data we expect inside the JWT payload.
// auth-service must create tokens with at least these fields.
interface JwtPayload {
  sub: string        // "subject" — the user's unique ID (standard JWT field)
  email: string      // user's email address
  role: string       // e.g. "admin", "member", "viewer"
  workspaceId: string // which workspace this session belongs to
  iat?: number       // "issued at" timestamp (set automatically by jwt.sign)
  exp?: number       // "expires at" timestamp (set automatically by jwt.sign)
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    // ConfigService is injected by NestJS automatically (dependency injection).
    // We use it to read the JWT secret from our config instead of hardcoding it.
    private readonly config: ConfigService,
  ) {}

  /**
   * use() runs on every request that reaches this middleware.
   * It either calls next() to continue, or throws 401 to stop the request.
   */
  use(req: Request, res: Response, next: NextFunction) {
    // Read the Authorization header. It should look like: "Bearer eyJhbGci..."
    const authHeader = req.headers.authorization

    if (!authHeader) {
      // No token provided at all — reject immediately.
      throw new UnauthorizedException('Authorization header is required')
    }

    // Split "Bearer eyJhbGci..." into ["Bearer", "eyJhbGci..."]
    const [scheme, token] = authHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
      // Malformed header format — reject.
      throw new UnauthorizedException('Authorization header must use Bearer scheme')
    }

    // Read the JWT secret from our typed config (configured in configuration.ts).
    const secret = this.config.get<string>('jwt.secret')

    // jwt.verify() does two things at once:
    //   1. Checks the signature (was this token created with our secret? not tampered?)
    //   2. Checks the expiry (is exp timestamp still in the future?)
    // If either check fails, it throws a JsonWebTokenError or TokenExpiredError.
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, secret) as JwtPayload
    } catch (err) {
      // Token is expired, forged, or malformed — reject with a clear message.
      const message = err instanceof jwt.TokenExpiredError
        ? 'Token has expired, please log in again'
        : 'Invalid token'
      throw new UnauthorizedException(message)
    }

    // Token is valid. Attach the decoded payload to req.user so that:
    // - ProxyService can read the userId and forward it as a header
    // - Any other middleware/guard later in the chain can access user info
    req.user = payload

    // Inject x-user-id as a trusted header for downstream services.
    // Downstream services (auth-service, agent-service, etc.) trust this header
    // because it only comes from the gateway — clients cannot set it directly
    // (the gateway overwrites it here every time).
    req.headers['x-user-id'] = payload.sub
    req.headers['x-user-role'] = payload.role
    req.headers['x-workspace-id'] = payload.workspaceId

    // Auth passed — continue to the next middleware (RateLimitMiddleware).
    next()
  }
}
