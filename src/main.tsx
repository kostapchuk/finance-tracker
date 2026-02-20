import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import { App } from './app/App'
import { setSyncQueryClient } from './database/syncService'
import { queryClient } from './lib/queryClient'

// Initialize sync service with queryClient for cache invalidation
setSyncQueryClient(queryClient)

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
