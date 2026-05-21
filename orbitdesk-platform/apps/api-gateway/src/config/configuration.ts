/**
 * configuration.ts — Typed environment variable config for the entire gateway.
 *
 * Problem: if you read process.env.SOME_VAR directly everywhere in your code,
 *   - You get raw strings (no types, no defaults)
 *   - If the variable name is misspelled you get undefined silently
 *   - Hard to know which env vars the app needs just by reading the code
 *
 * Solution: one central place that reads ALL env vars, applies defaults,
 * and exports a typed object. Every other file uses ConfigService to read
 * from this object — not from process.env directly.
 *
 * Usage in any service/controller:
 *   constructor(private config: ConfigService) {}
 *   const secret = this.config.get<string>('jwt.secret')
 *   const authUrl = this.config.get<string>('services.auth')
 */

export default () => ({
  // The HTTP port this gateway listens on.
  // Default 8000 matches what the frontend SDK expects (packages/sdk/src/client.ts).
  port: parseInt(process.env.PORT || '8000', 10),

  // JWT (JSON Web Token) config — used by AuthMiddleware to verify tokens.
  // The secret must be identical to the one used by auth-service when it signs tokens.
  // In production, use a long random string stored in a secrets manager.
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-in-production',
    // How long a token is valid. 'expiresIn' is set by auth-service when it creates tokens.
    // The gateway just verifies — it doesn't create tokens itself.
  },

  // Downstream service URLs — where the gateway forwards each /api/* path.
  // In Docker Compose, service names resolve as hostnames (e.g., "auth-service:3001").
  // In local dev, everything is localhost on different ports.
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    agent: process.env.AGENT_SERVICE_URL || 'http://localhost:3003',
    chat: process.env.AI_CORE_URL || 'http://localhost:3004',
    document: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3005',
    workflow: process.env.WORKFLOW_SERVICE_URL || 'http://localhost:3006',
    integration: process.env.INTEGRATION_SERVICE_URL || 'http://localhost:3007',
    ml: process.env.ML_PIPELINE_URL || 'http://localhost:3008',
  },

  // Rate limiting config — enforced by RateLimitMiddleware.
  // windowMs: the rolling time window in milliseconds (60000 = 1 minute)
  // max: how many requests are allowed per IP in that window
  // In production, back this with Redis so limits are shared across multiple
  // gateway instances (in-memory limits only work for single-instance deployments).
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
})
