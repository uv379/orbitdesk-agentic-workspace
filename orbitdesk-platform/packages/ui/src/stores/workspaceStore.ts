import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Workspace {
  id: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  avatarUrl?: string
}

interface WorkspaceState {
  current: Workspace
  list: Workspace[]
  sidebarCollapsed: boolean
  setCurrent: (ws: Workspace) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'ws-1', name: 'Acme Corp', plan: 'pro' },
  { id: 'ws-2', name: 'Personal', plan: 'free' },
  { id: 'ws-3', name: 'Side Project Co.', plan: 'free' },
]

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      current: DEFAULT_WORKSPACES[0],
      list: DEFAULT_WORKSPACES,
      sidebarCollapsed: false,
      setCurrent: (ws) => set({ current: ws }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'orbitdesk-workspace' },
  ),
)
