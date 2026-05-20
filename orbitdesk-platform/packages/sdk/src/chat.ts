import { apiClient } from './client'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  updatedAt: string
}

export const chatSDK = {
  listConversations: () =>
    apiClient<Conversation[]>('/api/chat/conversations'),

  getMessages: (conversationId: string) =>
    apiClient<Message[]>(`/api/chat/conversations/${conversationId}/messages`),

  createConversation: (title?: string) =>
    apiClient<Conversation>('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  sendMessage: (conversationId: string, content: string) =>
    apiClient<Message>(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deleteConversation: (conversationId: string) =>
    apiClient<void>(`/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    }),
}
