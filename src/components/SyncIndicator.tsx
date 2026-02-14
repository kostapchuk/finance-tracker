import { RefreshCw, WifiOff, AlertCircle, Check } from 'lucide-react'

import { useSync } from '@/hooks/useSync'
import { getLanguage } from '@/utils/i18n'

const translations = {
  en: {
    syncing: 'Syncing...',
    syncPending: '{count} pending',
    syncOffline: 'Offline',
    syncError: 'Sync failed',
    syncComplete: 'Synced',
  },
  ru: {
    syncing: 'Синхронизация...',
    syncPending: '{count} ожидает',
    syncOffline: 'Оффлайн',
    syncError: 'Ошибка синхронизации',
    syncComplete: 'Синхронизировано',
  },
}

function t(key: keyof typeof translations.en): string {
  const lang = getLanguage()
  return translations[lang][key] || translations.en[key]
}

export function SyncIndicator() {
  const { status, pendingCount, isOffline } = useSync()

  if (isOffline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
        <WifiOff className="w-3 h-3" />
        <span>{t('syncOffline')}</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
        <AlertCircle className="w-3 h-3" />
        <span>{t('syncError')}</span>
      </div>
    )
  }

  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>{t('syncing')}</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
        <RefreshCw className="w-3 h-3" />
        <span>{t('syncPending').replace('{count}', String(pendingCount))}</span>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
        <Check className="w-3 h-3" />
        <span>{t('syncComplete')}</span>
      </div>
    )
  }

  return null
}
