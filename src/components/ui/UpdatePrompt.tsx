import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'

export function UpdatePrompt() {
  const { t } = useLanguage()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between gap-3 safe-top">
      <span className="text-sm font-medium">{t('updateAvailable')}</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => updateServiceWorker(true)}
      >
        {t('updateNow')}
      </Button>
    </div>
  )
}
