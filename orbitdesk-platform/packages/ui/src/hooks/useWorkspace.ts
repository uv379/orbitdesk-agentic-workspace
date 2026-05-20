import { useWorkspaceStore } from '../stores/workspaceStore'

// Single hook — any MFE imports this to get current workspace
export function useWorkspace() {
  return useWorkspaceStore((s) => ({
    current: s.current,
    list: s.list,
    setCurrent: s.setCurrent,
  }))
}
