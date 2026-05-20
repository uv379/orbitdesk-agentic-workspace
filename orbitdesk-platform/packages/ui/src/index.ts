// Stores — THE single source of truth, shared across shell + all MFEs
export { useAuthStore } from './stores/authStore'
export { useWorkspaceStore } from './stores/workspaceStore'
export type { AuthUser } from './stores/authStore'
export type { Workspace } from './stores/workspaceStore'

// Hooks — what every MFE imports to read shared state
export { useAuth } from './hooks/useAuth'
export { useWorkspace } from './hooks/useWorkspace'
export { useStream } from './hooks/useStream'

// Components — write once, use in every MFE
export { Button } from './components/Button'
export { Avatar } from './components/Avatar'
export { Spinner } from './components/Spinner'
export { Badge } from './components/Badge'

// Utils — pure helpers, no side effects
export { cn } from './utils/cn'
export { formatDate, formatTime, timeAgo, truncate, titleCase } from './utils/format'

// Secure storage — in case MFEs need to store their own encrypted data
export { secureSet, secureGet, secureRemove } from './lib/secureStorage'
