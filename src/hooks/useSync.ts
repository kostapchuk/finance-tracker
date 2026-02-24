import { useState, useEffect } from 'react'

import { useSyncState, syncService } from '@/database/syncService'

export function useSync() {
  const state = useSyncState()
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    globalThis.addEventListener('online', handleOnline)
    globalThis.addEventListener('offline', handleOffline)

    return () => {
      globalThis.removeEventListener('online', handleOnline)
      globalThis.removeEventListener('offline', handleOffline)
    }
  }, [])

  const sync = async () => {
    await syncService.syncAll()
  }

  return {
    ...state,
    sync,
    isOffline,
  }
}
