import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@orbitdesk/ui'

function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
    </div>
  )
}

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  if (!hasHydrated) return <FullScreenSpinner />
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
