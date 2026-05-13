import { type ReactNode, useEffect } from 'react'
import { useAuthStore } from './authStore'

interface Props {
  children: ReactNode
}

export function AuthProvider({ children }: Props) {
  const { accessToken, clearAuth } = useAuthStore()

  // Token refresh interval — replace with real refresh logic
  useEffect(() => {
    if (!accessToken) return
    const REFRESH_INTERVAL = 14 * 60 * 1000 // 14 min (before typical 15-min expiry)
    const id = setInterval(() => {
      // TODO: call refresh endpoint, call setAuth with new token
      console.log('[AuthProvider] token refresh tick')
    }, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [accessToken, clearAuth])

  return <>{children}</>
}
