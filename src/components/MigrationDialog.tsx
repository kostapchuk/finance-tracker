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
  const { migration, startMigration, skipMigration, dismissMigrationDialog } = useAppStore()
  const { t } = useLanguage()

  if (!migration.showMigrationDialog) return null

  const handleMigrate = () => {
    if (!confirm(`${t('migrateConfirmTitle')}\n\n${t('migrateConfirmMessage')}`)) return
    startMigration()
  }

  const handleStartFresh = () => {
    if (!confirm(`${t('startFreshConfirmTitle')}\n\n${t('startFreshConfirmMessage')}`)) return
    skipMigration()
  }

  const handleDismiss = () => {
    dismissMigrationDialog()
  }

  return (
    <Dialog open={migration.showMigrationDialog} onOpenChange={() => handleDismiss()}>
      <DialogContent className="max-w-md">
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
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <button
              onClick={handleDismiss}
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium',
                'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                'h-10 px-4 py-2 w-full sm:w-auto'
              )}
            >
              {t('migrateLater')}
            </button>
            <button
              onClick={handleStartFresh}
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium',
                'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                'h-10 px-4 py-2 w-full sm:w-auto'
              )}
            >
              {t('startFresh')}
            </button>
            <button
              onClick={handleMigrate}
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'h-10 px-4 py-2 w-full sm:w-auto'
              )}
            >
              {t('migrateData')}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
