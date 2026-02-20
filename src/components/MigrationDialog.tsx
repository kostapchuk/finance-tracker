import { Check } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'

export function MigrationDialog() {
  const { migration, startMigration, dismissMigrationDialog, dismissCloudSyncEnabledDialog } =
    useAppStore()
  const { t } = useLanguage()

  const handleMigrate = () => {
    if (!confirm(`${t('migrateConfirmTitle')}\n\n${t('migrateConfirmMessage')}`)) return
    startMigration()
  }

  const handleDismiss = () => {
    dismissMigrationDialog()
  }

  const handleCloudSyncEnabledDismiss = () => {
    dismissCloudSyncEnabledDialog()
  }

  return (
    <>
      {/* Migration dialog for existing local data */}
      <Dialog open={migration.showMigrationDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" hideClose modal>
          <DialogHeader>
            <DialogTitle>{t('migrateDialogTitle')}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {migration.isMigrating ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t('migratingToCloud')}</p>
                {migration.migrationProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{migration.migrationProgress.entity}</span>
                      <span>
                        {migration.migrationProgress.current} / {migration.migrationProgress.total}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(migration.migrationProgress.current / migration.migrationProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : migration.migrationError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{migration.migrationError}</p>
                <button
                  onClick={startMigration}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md text-sm font-medium',
                    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                    'h-10 px-4 py-2 w-full'
                  )}
                >
                  {t('retry')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('migrationFoundData')}</p>
                <p className="text-xs text-muted-foreground">{t('migrationNote')}</p>
              </div>
            )}
          </div>

          {!migration.isMigrating && !migration.migrationError && (
            <DialogFooter className="flex-col gap-4">
              <button
                onClick={handleMigrate}
                className={cn(
                  'inline-flex items-center justify-center rounded-md text-sm font-medium',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'h-10 px-4 py-2 w-full'
                )}
              >
                {t('migrateData')}
              </button>
              <button
                onClick={handleDismiss}
                className={cn(
                  'inline-flex items-center justify-center rounded-md text-sm font-medium',
                  'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                  'h-10 px-4 py-2 w-full'
                )}
              >
                {t('migrateLater')}
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Cloud sync enabled confirmation dialog */}
      <Dialog open={migration.showCloudSyncEnabledDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" hideClose modal>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              {t('cloudSyncEnabled')}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">{t('cloudSyncEnabledMessage')}</p>
          </div>

          <DialogFooter>
            <button
              onClick={handleCloudSyncEnabledDismiss}
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'h-10 px-4 py-2 w-full'
              )}
            >
              {t('confirm')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
