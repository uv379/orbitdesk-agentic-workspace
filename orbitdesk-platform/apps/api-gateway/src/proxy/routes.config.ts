/**
 * routes.config.ts — Maps URL path prefixes to downstream service URLs.
 *
 * This is the "routing table" of the gateway. When a request arrives at
 * /api/chat/conversations, the gateway looks up "chat" in this map and
 * knows to forward the request to the ai-core-service.
 *
 * Structure:
 *   Key   = the path segment right after /api/ (e.g. "chat" from /api/chat/...)
 *   Value = the base URL of the target service
 *
 * The actual URLs are read from environment variables via ConfigService.
 * This function receives the already-resolved config object so that
 * ProxyService can call getRoutes(config) once at startup and cache the map.
 *
 * Mapping reference (matches your SDK routes in packages/sdk/src/):
 *   /api/auth/*          → auth-service      (login, register, token refresh)
 *   /api/users/*         → user-service       (profile, workspace members)
 *   /api/agents/*        → agent-service      (list agents, start/get runs)
 *   /api/chat/*          → ai-core-service    (conversations, messages)
 *   /api/documents/*     → document-service   (upload, list, download)
 *   /api/workflows/*     → workflow-service   (workflow CRUD, execution)
 *   /api/integrations/*  → integration-service(third-party connectors)
 *   /api/ml/*            → ml-pipeline-service(model training, inference jobs)
 */

export interface ServiceRoutes {
  [prefix: string]: string // { "chat": "http://ai-core-service:3004", ... }
}

/**
 * getRoutes() returns the routing table built from resolved config values.
 *
 * @param services - The services config object from configuration.ts
 * @returns A plain object mapping path prefix → service base URL
 */
export function getRoutes(services: Record<string, string>): ServiceRoutes {
  return {
    auth:         services.auth,         // /api/auth/*        → auth-service
    users:        services.user,         // /api/users/*       → user-service
    agents:       services.agent,        // /api/agents/*      → agent-service
    chat:         services.chat,         // /api/chat/*        → ai-core-service
    documents:    services.document,     // /api/documents/*   → document-service
    workflows:    services.workflow,     // /api/workflows/*   → workflow-service
    integrations: services.integration,  // /api/integrations/*→ integration-service
    ml:           services.ml,           // /api/ml/*          → ml-pipeline-service
  }
}
