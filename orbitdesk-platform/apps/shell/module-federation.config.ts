export const mfConfig = {
  name: 'shell',
  remotes: {
    mfe_dashboard: 'http://localhost:3001/assets/remoteEntry.js',
    mfe_chat: 'http://localhost:3002/assets/remoteEntry.js',
    mfe_documents: 'http://localhost:3003/assets/remoteEntry.js',
    mfe_agents: 'http://localhost:3004/assets/remoteEntry.js',
    mfe_workflows: 'http://localhost:3005/assets/remoteEntry.js',
    mfe_integrations: 'http://localhost:3006/assets/remoteEntry.js',
    mfe_artifacts: 'http://localhost:3007/assets/remoteEntry.js',
    mfe_usage: 'http://localhost:3008/assets/remoteEntry.js',
    mfe_settings: 'http://localhost:3009/assets/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.3.1' },
    'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
    'react-router-dom': { singleton: true, requiredVersion: '^6.28.0' },
    zustand: { singleton: true, requiredVersion: '^5.0.0' },
  },
}
