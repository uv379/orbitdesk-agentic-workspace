# apps/shell

The host application for OrbitDesk. It owns the browser URL bar, authentication flow, shared layout (Sidebar + TopBar), and lazy-loads every MFE via Module Federation.

---

## How to run

```bash
cd apps/shell
npm install
npm run dev        # http://localhost:3000
```

---

## Directory structure

```
apps/shell/
├── module-federation.config.ts   # MFE remote URLs + shared npm packages
├── vite.config.ts                # Vite + federation plugin + all path aliases
├── tsconfig.json                 # TypeScript config — paths mirror vite aliases
├── src/
│   ├── app-entry.tsx             # DOM mount point — renders <AppRoot>
│   ├── app-root.tsx              # Providers tree: BrowserRouter > AuthProvider > WorkspaceProvider > AppRouter
│   ├── index.css                 # Tailwind base + CSS custom properties (sidebar colours)
│   ├── mfe.d.ts                  # Ambient declarations for all MFE remote modules
│   │
│   ├── auth/
│   │   ├── AuthProvider.tsx      # Token refresh interval; wraps entire app
│   │   ├── authStore.ts          # Re-exports useAuthStore + AuthUser from @orbitdesk/ui
│   │   └── ProtectedRoute.tsx    # Guards /app/* — redirects to /login if not authenticated
│   │
│   ├── workspace/
│   │   ├── WorkspaceProvider.tsx # Thin provider — placeholder for async workspace fetching
│   │   └── workspaceStore.ts     # Re-exports useWorkspaceStore + Workspace from @orbitdesk/ui
│   │
│   ├── lib/
│   │   └── secureStorage.ts      # Re-exports secureSet/secureGet/secureRemove from @orbitdesk/ui
│   │
│   ├── layout/
│   │   ├── AppShell.tsx          # Fixed Sidebar + fixed TopBar + scrollable <Outlet> (main content)
│   │   ├── Sidebar.tsx           # Nav links, workspace switcher, user card, logout, collapse toggle
│   │   ├── TopBar.tsx            # Page title, search, notifications, contextual CTA, user menu
│   │   └── WorkspaceSwitcher.tsx # Dropdown to switch between workspaces from workspaceStore
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx         # Public — email + password, remember me, show/hide password
│   │   ├── SignupPage.tsx        # Public — full name, email, password, workspace name, timezone, terms
│   │   ├── LoadingPage.tsx       # Skeleton shown by <Suspense> while an MFE loads
│   │   ├── PlaceholderPage.tsx   # Fallback when an MFE remote is not reachable
│   │   └── NotFoundPage.tsx      # 404 for unknown routes
│   │
│   └── router/
│       ├── AppRouter.tsx         # Route tree — see routing section below
│       └── routes.ts             # APP_ROUTES config array + getRouteConfig() helper
```

---

## Routing

```
/              → redirect to /login
/login         → LoginPage       (public)
/signup        → SignupPage      (public)
<ProtectedRoute>
  /app/*       → AppShell layout
    dashboard  → mfe_dashboard/App
    chat       → mfe_chat/App
    documents  → mfe_documents/App
    agents     → mfe_agents/App
    workflows  → mfe_workflows/App
    integrations → mfe_integrations/App
    artifacts  → mfe_artifacts/App
    usage      → mfe_usage/App
    settings   → mfe_settings/App
    *          → NotFoundPage
*              → NotFoundPage
```

`ProtectedRoute` reads `isAuthenticated` and `_hasHydrated` from the auth store. It shows a spinner until hydration completes, then redirects to `/login` if not authenticated.

Every MFE route falls back to `PlaceholderPage` if the remote is unreachable (network error at `import()`), so the shell always renders even when MFEs are offline.

---

## Authentication flow

1. User lands on `/` → redirected to `/login`.
2. User submits login/signup form → `setAuth(user, token)` is called.
3. `setAuth` AES-encrypts `{ user, accessToken }` into `localStorage['orbitdesk-auth']` and sets Zustand state.
4. `navigate('/app/dashboard', { replace: true })` fires.
5. `ProtectedRoute` sees `isAuthenticated: true` → renders `<AppShell>`.
6. On page refresh: `authStore.ts` in `packages/ui` reads + decrypts localStorage at module load time, then sets `_hasHydrated: true`.
7. `AuthProvider` runs a `setInterval` every 14 minutes as a placeholder for token refresh logic.
8. Logout calls `clearAuth()` → removes localStorage entry → navigate to `/login`.

---

## Module Federation config

```
apps/shell/module-federation.config.ts
```

- **name**: `shell`
- **remotes**: 9 MFEs on ports 3001–3009, each serving `assets/remoteEntry.js`
- **shared**: only real npm packages — `react`, `react-dom`, `react-router-dom`, `zustand`
- `@orbitdesk/ui` and `@orbitdesk/sdk` are **NOT** in shared — they are path aliases compiled into each app, not npm packages

---

## Vite + TypeScript aliases

All aliases are defined in both `vite.config.ts` (runtime) and `tsconfig.json` (type-checking).

| Alias | Resolves to |
|---|---|
| `@/*` | `src/*` |
| `@orbitdesk/ui` | `../../packages/ui/src` |
| `@orbitdesk/sdk` | `../../packages/sdk/src` |
| `zustand` | `node_modules/zustand/esm/index.mjs` |
| `zustand/vanilla` | `node_modules/zustand/esm/vanilla.mjs` |
| `zustand/react` | `node_modules/zustand/esm/react.mjs` |
| `zustand/middleware` | `node_modules/zustand/esm/middleware.mjs` |
| `zustand/shallow` | `node_modules/zustand/esm/shallow.mjs` |
| `crypto-js` | `node_modules/crypto-js/crypto-js.js` |

Zustand aliases use **regex exact-match** (`/^zustand$/`) in the Vite array form to prevent string prefix bleed (e.g. `zustand` matching `zustand/vanilla`). Zustand v5 ships its main entry as CJS — the ESM `.mjs` files are aliased directly.

---

## Routes config — `src/router/routes.ts`

`APP_ROUTES` is the single source of truth for navigation. Each entry has:

```ts
interface RouteConfig {
  path: string         // e.g. '/app/chat'
  label: string        // shown in TopBar title + Sidebar nav
  icon: LucideIcon
  remote?: string      // MFE federation key
  ctxButton?: {        // optional "New Chat" style CTA in TopBar
    label: string
    icon: LucideIcon
  }
}
```

`Sidebar` and `TopBar` both read from `APP_ROUTES` — add a new MFE route here and it appears in the nav automatically.

---

## Key decisions

- **No root `package.json` / npm workspaces** — `packages/` is wired via path aliases only.
- **No `@orbitdesk/*` in module federation shared** — they are source-level aliases, not distributable packages.
- **`crypto-js` for encryption** — AES encrypt on write, decrypt on read. Secret key is hardcoded for now; swap with env var or server-derived key before production.
- **Zustand without middleware** — auth store uses manual `secureGet`/`secureSet` calls instead of the persist middleware, keeping the encryption layer explicit.
- **`_hasHydrated` flag** — prevents a flash-to-login on page refresh while the store reads localStorage. Always `true` by the time any component renders.
