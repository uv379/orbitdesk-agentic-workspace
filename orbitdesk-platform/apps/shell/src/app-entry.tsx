import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRoot } from './app-root'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>
)
