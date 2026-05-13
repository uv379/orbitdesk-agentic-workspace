import { useAuthStore } from './authStore'

export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  return { user, accessToken, isAuthenticated, setAuth, clearAuth }
}
