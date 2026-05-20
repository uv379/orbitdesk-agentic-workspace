import { apiClient } from './client'

export interface Agent {
  id: string
  name: string
  description: string
  tools: string[]
}

export interface AgentRun {
  id: string
  agentId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  input: string
  output?: string
  startedAt: string
  finishedAt?: string
}

export const agentsSDK = {
  list: () =>
    apiClient<Agent[]>('/api/agents'),

  getRun: (runId: string) =>
    apiClient<AgentRun>(`/api/agents/runs/${runId}`),

  startRun: (agentId: string, input: string) =>
    apiClient<AgentRun>('/api/agents/runs', {
      method: 'POST',
      body: JSON.stringify({ agentId, input }),
    }),

  listRuns: (agentId: string) =>
    apiClient<AgentRun[]>(`/api/agents/${agentId}/runs`),
}
