import { useAuthStore } from '@orbitdesk/ui'

// Override via window.__ORBITDESK_API_URL__ or default to localhost for dev
const API_BASE: string =
  (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ORBITDESK_API_URL__ as string) ||
  'http://localhost:8000'

// Every API call goes through here — token is auto-attached from the shared auth store
export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().accessToken

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'Request failed')
  }

  return res.json() as Promise<T>
}
