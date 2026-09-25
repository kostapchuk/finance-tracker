import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import { App } from './app/App'
import { initAnalytics } from './utils/analytics'

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

void initAnalytics()
