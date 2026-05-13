import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Bot,
  GitBranch,
  Plug,
  Package,
  BarChart2,
  Settings,
  Plus,
  Upload,
  Play,
  type LucideIcon,
} from 'lucide-react'

export interface CtxButton {
  label: string
  icon: LucideIcon
}

export interface RouteConfig {
  path: string
  label: string
  icon: LucideIcon
  remote?: string // MFE remote key from module-federation.config
  ctxButton?: CtxButton
  hideFromNav?: boolean
}

export const APP_ROUTES: RouteConfig[] = [
  {
    path: '/app/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    remote: 'mfe_dashboard',
  },
  {
    path: '/app/chat',
    label: 'Chat',
    icon: MessageSquare,
    remote: 'mfe_chat',
    ctxButton: { label: 'New Chat', icon: Plus },
  },
  {
    path: '/app/documents',
    label: 'Documents',
    icon: FileText,
    remote: 'mfe_documents',
    ctxButton: { label: 'Upload Document', icon: Upload },
  },
  {
    path: '/app/agents',
    label: 'Agents',
    icon: Bot,
    remote: 'mfe_agents',
    ctxButton: { label: 'Run Agent', icon: Play },
  },
  {
    path: '/app/workflows',
    label: 'Workflows',
    icon: GitBranch,
    remote: 'mfe_workflows',
    ctxButton: { label: 'Create Workflow', icon: Plus },
  },
  {
    path: '/app/integrations',
    label: 'Integrations',
    icon: Plug,
    remote: 'mfe_integrations',
  },
  {
    path: '/app/artifacts',
    label: 'Artifacts',
    icon: Package,
    remote: 'mfe_artifacts',
  },
  {
    path: '/app/usage',
    label: 'Usage',
    icon: BarChart2,
    remote: 'mfe_usage',
  },
  {
    path: '/app/settings',
    label: 'Settings',
    icon: Settings,
    remote: 'mfe_settings',
  },
]

export function getRouteConfig(pathname: string): RouteConfig | undefined {
  return APP_ROUTES.find((r) => pathname.startsWith(r.path))
}
