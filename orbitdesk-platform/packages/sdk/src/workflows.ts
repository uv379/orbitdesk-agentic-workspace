import { apiClient } from './client'

export interface Workflow {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused'
  updatedAt: string
}

export interface WorkflowRun {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  finishedAt?: string
}

export const workflowsSDK = {
  list: () =>
    apiClient<Workflow[]>('/api/workflows'),

  get: (id: string) =>
    apiClient<Workflow>(`/api/workflows/${id}`),

  create: (name: string) =>
    apiClient<Workflow>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  trigger: (workflowId: string) =>
    apiClient<WorkflowRun>(`/api/workflows/${workflowId}/runs`, {
      method: 'POST',
    }),
}
