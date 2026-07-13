import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { normalizeWorkspaceUrl, workspaceFromUrl, documentTitle } from './lib/workspace'

normalizeWorkspaceUrl(workspaceFromUrl())
document.title = documentTitle(workspaceFromUrl())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
