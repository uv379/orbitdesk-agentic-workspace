import { useAuthStore } from '../stores/authStore'

// Single hook — any MFE imports this to get user/token
export function useAuth() {
  return useAuthStore((s) => ({
    user: s.user,
    accessToken: s.accessToken,
    isAuthenticated: s.isAuthenticated,
    setAuth: s.setAuth,
    clearAuth: s.clearAuth,
  }))
}
