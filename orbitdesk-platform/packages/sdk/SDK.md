# packages/sdk

Auth-aware API client for OrbitDesk. Every MFE imports from here via the `@orbitdesk/sdk` path alias to make backend calls. The client automatically attaches the logged-in user's Bearer token from the shared auth store — no manual token management needed in MFEs.

---

## Directory structure

```
packages/sdk/src/
├── index.ts        # Barrel — all public exports
├── client.ts       # Core fetch wrapper — auth header injection + error handling
├── chat.ts         # chatSDK — conversations + messages
├── documents.ts    # documentsSDK — list, get, upload, delete
├── agents.ts       # agentsSDK — list agents, start/get/list runs
└── workflows.ts    # workflowsSDK — list, get, create, trigger
```

---

## Core client — `client.ts`

```ts
apiClient<T>(path: string, options?: RequestInit): Promise<T>
```

- Reads `accessToken` from `useAuthStore.getState()` (no React hook — safe to call anywhere)
- Injects `Authorization: Bearer <token>` if a token exists
- Always sends `Content-Type: application/json`
- Throws `Error` with the server's `message` field (or status text) on non-2xx responses

**Base URL**: reads `window.__ORBITDESK_API_URL__` at runtime, falls back to `http://localhost:8000` for local dev. Set `window.__ORBITDESK_API_URL__ = 'https://api.yourapp.com'` in your deployment HTML to point at production.

---

## API modules

### `chatSDK`

```ts
import { chatSDK } from '@orbitdesk/sdk'

chatSDK.listConversations()                          // GET  /api/chat/conversations
chatSDK.getMessages(conversationId)                  // GET  /api/chat/conversations/:id/messages
chatSDK.createConversation(title?)                   // POST /api/chat/conversations
chatSDK.sendMessage(conversationId, content)         // POST /api/chat/conversations/:id/messages
chatSDK.deleteConversation(conversationId)           // DELETE /api/chat/conversations/:id
```

Types:
```ts
interface Message      { id, role: 'user'|'assistant', content, createdAt }
interface Conversation { id, title, updatedAt }
```

### `documentsSDK`

```ts
import { documentsSDK } from '@orbitdesk/sdk'

documentsSDK.list()          // GET    /api/documents
documentsSDK.get(id)         // GET    /api/documents/:id
documentsSDK.upload(file)    // POST   /api/documents/upload  (multipart — does NOT use apiClient)
documentsSDK.delete(id)      // DELETE /api/documents/:id
```

Types:
```ts
interface Document { id, name, size, status: 'processing'|'ready'|'failed', createdAt }
```

> **Note on upload**: `upload()` uses raw `fetch` instead of `apiClient` because the browser must set the `Content-Type: multipart/form-data; boundary=...` header itself. It reads the token directly from `localStorage['orbitdesk-token']` — update this once the token storage key is finalised.

### `agentsSDK`

```ts
import { agentsSDK } from '@orbitdesk/sdk'

agentsSDK.list()                          // GET  /api/agents
agentsSDK.getRun(runId)                   // GET  /api/agents/runs/:id
agentsSDK.startRun(agentId, input)        // POST /api/agents/runs
agentsSDK.listRuns(agentId)               // GET  /api/agents/:id/runs
```

Types:
```ts
interface Agent    { id, name, description, tools: string[] }
interface AgentRun { id, agentId, status: 'queued'|'running'|'completed'|'failed', input, output?, startedAt, finishedAt? }
```

### `workflowsSDK`

```ts
import { workflowsSDK } from '@orbitdesk/sdk'

workflowsSDK.list()               // GET  /api/workflows
workflowsSDK.get(id)              // GET  /api/workflows/:id
workflowsSDK.create(name)         // POST /api/workflows
workflowsSDK.trigger(workflowId)  // POST /api/workflows/:id/runs
```

Types:
```ts
interface Workflow    { id, name, status: 'draft'|'active'|'paused', updatedAt }
interface WorkflowRun { id, workflowId, status: 'running'|'completed'|'failed', startedAt, finishedAt? }
```

---

## Public API — `index.ts`

```ts
export { apiClient } from './client'
export { chatSDK } from './chat'
export { documentsSDK } from './documents'
export { agentsSDK } from './agents'
export { workflowsSDK } from './workflows'

export type { Message, Conversation } from './chat'
export type { Document } from './documents'
export type { Agent, AgentRun } from './agents'
export type { Workflow, WorkflowRun } from './workflows'
```

---

## How MFEs consume this package

Each MFE adds to its `vite.config.ts`:
```ts
alias: [
  { find: '@orbitdesk/sdk', replacement: resolve(__dirname, '../../packages/sdk/src') },
]
```
And to its `tsconfig.json`:
```json
"paths": {
  "@orbitdesk/sdk": ["../../packages/sdk/src/index.ts"]
}
```

Usage inside an MFE:
```ts
import { chatSDK } from '@orbitdesk/sdk'

const conversations = await chatSDK.listConversations()
```

No token setup needed — the client picks it up from the shared auth store automatically.

---

## Key decisions

- **`useAuthStore.getState()`** (not a hook) — safe to call in async functions, outside React components, inside event handlers. Zustand's `.getState()` always returns the current state synchronously.
- **No `package.json` in `packages/sdk`** — consumed via Vite path alias, not npm install.
- **`window.__ORBITDESK_API_URL__`** instead of `import.meta.env` — avoids a Vite-specific type dependency in a package that may be consumed by MFEs with their own Vite configs.
- **`apiClient` is exported** — MFEs can call arbitrary endpoints not covered by the typed SDK modules by importing `apiClient` directly.
