import { useSyncState, syncService } from '@/database/syncService'

export function useSync() {
  const state = useSyncState()

  const sync = async () => {
    await syncService.syncAll()
  }

  return {
    ...state,
    sync,
    isOffline: !navigator.onLine,
  }
}
