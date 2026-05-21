# apps/api-gateway

The single public entry point for the entire OrbitDesk backend. Every request from the browser hits this service first. It authenticates the request, stamps a trace ID, enforces rate limits, then forwards the request to the correct downstream service.

Built with **NestJS** on **port 8000** — the same port the frontend SDK (`packages/sdk/src/client.ts`) points to by default.

---

## How to run

```bash
# Option 1 — local dev (no Docker, services must be running separately)
cp apps/api-gateway/.env.local.template apps/api-gateway/.env
# Add JWT_SECRET manually (copy from infra/compose/.env.shared.template)
cd apps/api-gateway
npm install
npm run start:dev        # http://localhost:8000

# Option 2 — full stack via Docker (recommended)
make setup               # copies both .env templates
make dev                 # starts everything
```

---

## Directory structure

```
apps/api-gateway/
├── Dockerfile                            # 2-stage build: compile TS → run plain JS
├── nest-cli.json                         # NestJS build tool config
├── package.json                          # NestJS + Axios + Socket.IO + JWT deps
├── tsconfig.json                         # TypeScript config (emitDecoratorMetadata required)
├── .env.local.template                   # gateway-only vars template (copy → .env)
└── src/
    ├── main.ts                           # Bootstrap: CORS, global filter, listen :8000
    ├── app.module.ts                     # Root module — imports all modules, wires middleware
    │
    ├── config/
    │   └── configuration.ts             # Typed env config (port, jwt, services, rateLimit)
    │
    ├── filters/
    │   └── http-exception.filter.ts     # Global error catcher → { statusCode, message, traceId }
    │
    ├── middleware/                       # Runs on every /api/* request in this order:
    │   ├── request-id.middleware.ts     # 1st — stamps X-Trace-Id (UUID) on req + res headers
    │   ├── auth.middleware.ts           # 2nd — verifies JWT, injects x-user-id/role/workspace-id
    │   └── rate-limit.middleware.ts     # 3rd — 100 req/min per user (in-memory, use Redis in prod)
    │
    ├── proxy/
    │   ├── routes.config.ts             # Map: path prefix → service base URL
    │   ├── proxy.service.ts             # Axios forwarding, strips /api/<key>, handles timeouts
    │   ├── proxy.controller.ts          # @All('*') catch-all, delegates to proxy.service
    │   └── proxy.module.ts             # Registers controller + service + HttpModule
    │
    ├── websocket/
    │   └── gateway.ts                   # Socket.IO /ws namespace — streams AI tokens to mfe-chat
    │
    └── health/
        └── health.controller.ts         # GET /health/live + GET /health/ready
```

---

## Request flow

```
Browser request
  → RequestIdMiddleware    stamps X-Trace-Id: <uuid>
  → AuthMiddleware         verifies JWT, injects x-user-id / x-user-role / x-workspace-id
  → RateLimitMiddleware    100 req/min per user, returns 429 if exceeded
  → ProxyController        @All('*') receives every /api/* route
  → ProxyService           strips /api/<service-key>, forwards to downstream URL
  → Downstream service     processes and responds
  → ProxyService           mirrors status + body back to browser
```

Public routes (excluded from auth + rate-limit):
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /health/*`

---

## Route map

| Gateway path | Downstream service | Port |
|---|---|---|
| `/api/auth/*` | auth-service | 3001 |
| `/api/users/*` | user-service | 3002 |
| `/api/agents/*` | agent-service | 3003 |
| `/api/chat/*` | ai-core-service | 3004 |
| `/api/documents/*` | document-service | 3005 |
| `/api/workflows/*` | workflow-service | 3006 |
| `/api/integrations/*` | integration-service | 3007 |
| `/api/ml/*` | ml-pipeline-service | 3008 |

---

## Environment variables

Gateway reads from two sources — see `.env.local.template` for the full list.

| Variable | Source | Purpose |
|---|---|---|
| `JWT_SECRET` | `infra/compose/.env.shared.template` | Verify JWT tokens (auth-service uses same secret to sign) |
| `PORT` | `.env.local.template` | Server port (default 8000) |
| `CORS_ORIGIN` | `.env.local.template` | Allowed frontend origin |
| `AUTH_SERVICE_URL` … `ML_PIPELINE_URL` | `.env.local.template` | Downstream service base URLs |
| `RATE_LIMIT_WINDOW_MS` | `.env.local.template` | Rolling window in ms (default 60000) |
| `RATE_LIMIT_MAX` | `.env.local.template` | Max requests per window per user (default 100) |

In Docker, service URLs are overridden to Docker-internal hostnames (`http://auth-service:3001`) via the `environment:` block in `docker-compose.dev.yml`.

---

## WebSocket streaming

Clients connect to `ws://localhost:8000/ws` (Socket.IO namespace).

```
Client                          Gateway                       ai-core-service
  |-- connect (auth.token) ---→  |  verify JWT, join room      |
  |-- emit('chat:send', {...}) →  |  POST /conversations/:id/messages/stream
  |                               |←─── SSE stream ────────────|
  |←── emit('chat:chunk', text) --|
  |←── emit('chat:done') ---------|
```

Events:
- `chat:send` — client sends `{ conversationId, content, token }`
- `chat:chunk` — gateway emits `{ conversationId, text }` for each token
- `chat:done` — gateway emits `{ conversationId }` when stream ends
- `chat:error` — gateway emits `{ conversationId, message }` on failure

---

## Health endpoints

| Endpoint | Purpose | Auth required |
|---|---|---|
| `GET /health/live` | Always 200 — process is alive (Kubernetes liveness) | No |
| `GET /health/ready` | Pings auth + ai-core — returns 503 if either is down (Kubernetes readiness) | No |

---

## Key decisions

- **Middleware over Guards for auth** — middleware runs before any routing logic, making it the right layer for a gateway that authenticates at the edge before forwarding.
- **Single catch-all controller** — `@All('*')` in ProxyController means zero per-route maintenance. Adding a new service only requires updating `routes.config.ts`.
- **Trusted headers pattern** — gateway verifies the JWT once and injects `x-user-id`, `x-user-role`, `x-workspace-id` as headers. Downstream services trust these headers without re-checking the token.
- **In-memory rate limiting** — sufficient for a single instance. For horizontal scaling (multiple gateway pods), replace the `Map` in `rate-limit.middleware.ts` with Redis using the shared `REDIS_HOST`/`REDIS_PORT` from `.env.shared.template`.
- **validateStatus: () => true in Axios** — downstream error responses (4xx, 5xx) are forwarded as-is to the client rather than thrown as exceptions, so the error shape from each service is preserved.
