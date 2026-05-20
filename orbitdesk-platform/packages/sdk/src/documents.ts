import { apiClient } from './client'

export interface Document {
  id: string
  name: string
  size: number
  status: 'processing' | 'ready' | 'failed'
  createdAt: string
}

export const documentsSDK = {
  list: () =>
    apiClient<Document[]>('/api/documents'),

  get: (id: string) =>
    apiClient<Document>(`/api/documents/${id}`),

  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    // Don't use apiClient here — no Content-Type header (browser sets boundary)
    const token = localStorage.getItem('orbitdesk-token')
    return fetch('/api/documents/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then((r) => r.json() as Promise<Document>)
  },

  delete: (id: string) =>
    apiClient<void>(`/api/documents/${id}`, { method: 'DELETE' }),
}
