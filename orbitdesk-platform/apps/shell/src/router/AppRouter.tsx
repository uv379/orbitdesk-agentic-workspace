import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { LoadingPage } from '@/pages/LoadingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { ProtectedRoute } from '@/auth/ProtectedRoute'

// MFE remotes — each resolved via module federation at runtime.
// Fallback to placeholder pages while individual MFEs are not yet deployed.
const DashboardPage = lazy(() =>
  import('mfe_dashboard/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Dashboard' }) })))
)
const ChatPage = lazy(() =>
  import('mfe_chat/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Chat' }) })))
)
const DocumentsPage = lazy(() =>
  import('mfe_documents/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Documents' }) })))
)
const AgentsPage = lazy(() =>
  import('mfe_agents/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Agents' }) })))
)
const WorkflowsPage = lazy(() =>
  import('mfe_workflows/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Workflows' }) })))
)
const IntegrationsPage = lazy(() =>
  import('mfe_integrations/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Integrations' }) })))
)
const ArtifactsPage = lazy(() =>
  import('mfe_artifacts/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Artifacts' }) })))
)
const UsagePage = lazy(() =>
  import('mfe_usage/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Usage' }) })))
)
const SettingsPage = lazy(() =>
  import('mfe_settings/App').catch(() => import('@/pages/PlaceholderPage').then((m) => ({ default: () => m.PlaceholderPage({ label: 'Settings' }) })))
)

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app/*" element={<AppShell />}>
          <Route
            path="dashboard/*"
            element={<Suspense fallback={<LoadingPage />}><DashboardPage /></Suspense>}
          />
          <Route
            path="chat/*"
            element={<Suspense fallback={<LoadingPage />}><ChatPage /></Suspense>}
          />
          <Route
            path="documents/*"
            element={<Suspense fallback={<LoadingPage />}><DocumentsPage /></Suspense>}
          />
          <Route
            path="agents/*"
            element={<Suspense fallback={<LoadingPage />}><AgentsPage /></Suspense>}
          />
          <Route
            path="workflows/*"
            element={<Suspense fallback={<LoadingPage />}><WorkflowsPage /></Suspense>}
          />
          <Route
            path="integrations/*"
            element={<Suspense fallback={<LoadingPage />}><IntegrationsPage /></Suspense>}
          />
          <Route
            path="artifacts/*"
            element={<Suspense fallback={<LoadingPage />}><ArtifactsPage /></Suspense>}
          />
          <Route
            path="usage/*"
            element={<Suspense fallback={<LoadingPage />}><UsagePage /></Suspense>}
          />
          <Route
            path="settings/*"
            element={<Suspense fallback={<LoadingPage />}><SettingsPage /></Suspense>}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
