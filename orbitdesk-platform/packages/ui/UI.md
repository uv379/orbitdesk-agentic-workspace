# packages/ui

Shared frontend library for OrbitDesk. Every MFE and the shell imports from here via the `@orbitdesk/ui` path alias. Nothing in this package has a `package.json` — it is compiled directly from source by whichever Vite app consumes it.

---

## Directory structure

```
packages/ui/src/
├── index.ts              # Barrel — every public export lives here
│
├── stores/
│   ├── authStore.ts      # Auth state — user, token, isAuthenticated, _hasHydrated
│   └── workspaceStore.ts # Workspace list + current + sidebar state (persisted)
│
├── hooks/
│   ├── useAuth.ts        # Selector hook over authStore — convenient single import for MFEs
│   ├── useWorkspace.ts   # Selector hook over workspaceStore
│   └── useStream.ts      # SSE streaming hook for AI response streaming (used by mfe-chat)
│
├── components/
│   ├── Button.tsx        # variant: primary | secondary | ghost | danger  /  size: sm | md | lg
│   ├── Avatar.tsx        # Image or initials fallback  /  size: xs | sm | md | lg
│   ├── Badge.tsx         # Pill label  /  variant: default | success | warning | danger | info | purple
│   └── Spinner.tsx       # Animated border spinner  /  size: sm | md | lg
│
├── lib/
│   └── secureStorage.ts  # AES-encrypted localStorage (crypto-js)
│
└── utils/
    ├── cn.ts             # Class name merger (no clsx dependency)
    └── format.ts         # formatDate, formatTime, timeAgo, truncate, titleCase
```

---

## Stores

### `authStore.ts`

```ts
interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean       // true once localStorage read is complete
  setAuth(user, token): void  // encrypts to localStorage + sets state
  clearAuth(): void           // removes from localStorage + resets state
}
```

**Hydration** happens synchronously at module load time (bottom of the file):
```ts
const saved = secureGet<StoredAuth>(STORAGE_KEY)
if (saved?.user && saved?.accessToken) {
  useAuthStore.setState({ ...saved, isAuthenticated: true, _hasHydrated: true })
} else {
  useAuthStore.setState({ _hasHydrated: true })
}
```
`_hasHydrated` is always `true` by the time any React component renders. `ProtectedRoute` in the shell waits for it to avoid a flash-to-login on refresh.

**Storage key**: `orbitdesk-auth` (AES encrypted)

### `workspaceStore.ts`

```ts
interface WorkspaceState {
  current: Workspace
  list: Workspace[]
  sidebarCollapsed: boolean
  setCurrent(ws): void
  toggleSidebar(): void
  setSidebarCollapsed(collapsed): void
}
```

Uses Zustand `persist` middleware with the key `orbitdesk-workspace` (plain JSON — no encryption needed for workspace preference data).

Default workspaces are seeded in the store (`Acme Corp / Personal / Side Project Co.`) — replace with a real API call in `WorkspaceProvider`.

---

## Hooks

### `useAuth()`
```ts
const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuth()
```
Selector over `authStore` — MFEs use this instead of importing the store directly.

### `useWorkspace()`
```ts
const { current, list, setCurrent } = useWorkspace()
```
Selector over `workspaceStore`.

### `useStream({ url, token, enabled? })`
```ts
const { text, done, error } = useStream({ url: '/api/chat/stream/123', token })
```
Opens an SSE `EventSource`, accumulates streamed text chunks, closes on `[DONE]` sentinel. Primarily for `mfe-chat` AI streaming responses.

---

## Components

### `<Button>`
```tsx
<Button variant="primary" size="md" loading={false}>Save</Button>
```
- Variants: `primary` (violet), `secondary` (zinc), `ghost` (transparent), `danger` (red)
- Sizes: `sm`, `md`, `lg`
- `loading` prop shows an inline spinner and disables the button

### `<Avatar>`
```tsx
<Avatar name="Alex Rivera" src={avatarUrl} size="sm" />
```
- Shows `src` image if provided, otherwise renders initials from `name`
- Sizes: `xs` (24px), `sm` (32px), `md` (40px), `lg` (48px)

### `<Badge>`
```tsx
<Badge variant="success">Active</Badge>
```
- Variants: `default`, `success`, `warning`, `danger`, `info`, `purple`

### `<Spinner>`
```tsx
<Spinner size="md" />
```
- Sizes: `sm` (16px), `md` (24px), `lg` (32px)

---

## Utilities

### `cn(...classes)`
```ts
cn('base', isActive && 'active', className)
// → 'base active my-class'
```
Filters falsy values and joins with spaces. No external dependency.

### Format helpers
```ts
formatDate('2025-05-20T10:00:00Z')  // → 'May 20, 2025'
formatTime('2025-05-20T10:00:00Z')  // → '10:00 AM'
timeAgo('2025-05-20T09:00:00Z')     // → '1h ago'
truncate('Long string...', 60)       // → 'Long string...' (with ellipsis)
titleCase('hello world')             // → 'Hello World'
```

---

## Secure storage — `lib/secureStorage.ts`

```ts
secureSet<T>(key: string, value: T): void     // JSON.stringify → AES encrypt → localStorage.setItem
secureGet<T>(key: string): T | null           // localStorage.getItem → AES decrypt → JSON.parse
secureRemove(key: string): void               // localStorage.removeItem
```

- Encryption: `CryptoJS.AES` with a static secret key (`orbitdesk-secret-key`)
- Corrupt or tampered entries are caught, removed, and `null` is returned
- Replace the static secret with an env-derived or server-issued key before production

---

## Public API — `index.ts`

```ts
// Stores
export { useAuthStore } from './stores/authStore'
export { useWorkspaceStore } from './stores/workspaceStore'
export type { AuthUser } from './stores/authStore'
export type { Workspace } from './stores/workspaceStore'

// Hooks
export { useAuth } from './hooks/useAuth'
export { useWorkspace } from './hooks/useWorkspace'
export { useStream } from './hooks/useStream'

// Components
export { Button } from './components/Button'
export { Avatar } from './components/Avatar'
export { Spinner } from './components/Spinner'
export { Badge } from './components/Badge'

// Utils
export { cn } from './utils/cn'
export { formatDate, formatTime, timeAgo, truncate, titleCase } from './utils/format'

// Lib
export { secureSet, secureGet, secureRemove } from './lib/secureStorage'
```

---

## How MFEs consume this package

Each MFE project adds to its `vite.config.ts`:
```ts
alias: [
  { find: '@orbitdesk/ui', replacement: resolve(__dirname, '../../packages/ui/src') },
]
```
And to its `tsconfig.json`:
```json
"paths": {
  "@orbitdesk/ui": ["../../packages/ui/src/index.ts"]
}
```

Since every app resolves the same source files, Zustand store instances are singletons per-app. Module Federation's `shared: { zustand: { singleton: true } }` ensures only one Zustand instance exists across the shell + all loaded MFEs in the same browser tab.

---

## Key decisions

- **No `package.json` in `packages/ui`** — consumed via Vite path alias, not npm install.
- **Auth store uses manual secureGet/secureSet** — not Zustand `persist` middleware. Keeps the encryption layer explicit and avoids middleware complexity.
- **`_hasHydrated` is set synchronously** — the rehydration block at the bottom of `authStore.ts` runs before any component mounts, so `_hasHydrated` is always `true` on first render.
- **`workspaceStore` uses `persist` middleware** — workspace selection is non-sensitive UI state, so plain JSON localStorage is fine.
