// Auth store lives in @orbitdesk/ui so all MFEs share the same instance.
// Shell imports from there — never duplicate the store here.
export { useAuthStore, type AuthUser } from '@orbitdesk/ui'
