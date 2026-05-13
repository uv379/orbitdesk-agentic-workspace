import { type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

// Thin provider — store is already initialized by Zustand persist.
// Extend here with async workspace fetch if needed (e.g., on login).
export function WorkspaceProvider({ children }: Props) {
  return <>{children}</>
}
