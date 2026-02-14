import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'

export function MigrationDialog() {
  const { migration, startMigration, skipMigration } = useAppStore()

  if (!migration.showMigrationDialog) return null

  return (
    <Dialog open={migration.showMigrationDialog} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Migrate Your Data</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {migration.isMigrating ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Migrating your data to the cloud...</p>
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
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We found existing data on your device. Would you like to migrate it to the cloud for
                syncing across devices?
              </p>
              <p className="text-xs text-muted-foreground">
                Note: This will upload your data to Supabase. You can also start fresh if preferred.
              </p>
            </div>
          )}
        </div>

        {!migration.isMigrating && !migration.migrationError && (
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <button
              onClick={skipMigration}
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium',
                'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                'h-10 px-4 py-2 w-full sm:w-auto'
              )}
            >
              Start Fresh
            </button>
            <button
              onClick={startMigration}
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'h-10 px-4 py-2 w-full sm:w-auto'
              )}
            >
              Migrate Data
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
