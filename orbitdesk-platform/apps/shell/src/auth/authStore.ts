import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: 'usr-1',
        name: 'Alex Rivera',
        email: 'alex@acmecorp.io',
        avatarUrl: undefined,
      },
      accessToken: 'mock-token',
      isAuthenticated: true,
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: 'orbitdesk-auth' }
  )
)
