import { create } from 'zustand'
import { secureSet, secureGet, secureRemove } from '../lib/secureStorage'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface StoredAuth {
  user: AuthUser
  accessToken: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

const STORAGE_KEY = 'orbitdesk-auth'

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  _hasHydrated: false,

  setAuth: (user, accessToken) => {
    secureSet<StoredAuth>(STORAGE_KEY, { user, accessToken })
    set({ user, accessToken, isAuthenticated: true })
  },

  clearAuth: () => {
    secureRemove(STORAGE_KEY)
    set({ user: null, accessToken: null, isAuthenticated: false })
  },
}))

// Rehydrate from encrypted localStorage on app start
const saved = secureGet<StoredAuth>(STORAGE_KEY)
if (saved?.user && saved?.accessToken) {
  useAuthStore.setState({
    user: saved.user,
    accessToken: saved.accessToken,
    isAuthenticated: true,
    _hasHydrated: true,
  })
} else {
  useAuthStore.setState({ _hasHydrated: true })
}
