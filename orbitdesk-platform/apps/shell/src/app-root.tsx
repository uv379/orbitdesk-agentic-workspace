import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { WorkspaceProvider } from '@/workspace/WorkspaceProvider'
import { AppRouter } from '@/router/AppRouter'
import './index.css'

export function AppRoot() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <AppRouter />
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
