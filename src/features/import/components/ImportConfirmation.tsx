import { AlertCircle, CheckCircle2, Loader2, ArrowDown, ArrowUp, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import type { ParsedImportData, ImportResult } from '../types'

interface ImportConfirmationProps {
  data: ParsedImportData
  isImporting: boolean
  importResult: ImportResult | null
  onImport: () => void
  onBack: () => void
  onClose: () => void
}

export function ImportConfirmation({
  data,
  isImporting,
  importResult,
  onImport,
  onBack,
  onClose,
}: ImportConfirmationProps) {
  const { t } = useLanguage()

  // Show success state
  if (importResult?.success) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
            <h2 className="text-xl font-semibold">{t('importSuccess')}</h2>
            <p className="text-muted-foreground">
              {t('importSuccessMessage').replace('{count}', String(importResult.importedCount))}
            </p>
          </div>
        </div>
        <div className="p-4 border-t">
          <Button onClick={onClose} className="w-full">
            {t('importDone')}
          </Button>
        </div>
      </div>
    )
  }

  // Show error state
  if (importResult && !importResult.success) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <AlertCircle className="h-20 w-20 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">{t('importFailed')}</h2>
            <p className="text-muted-foreground">{importResult.error || t('importUnknownError')}</p>
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            {t('back')}
          </Button>
          <Button variant="destructive" onClick={onClose} className="flex-1">
            {t('cancel')}
          </Button>
        </div>
      </div>
    )
  }

  // Pre-import confirmation
  const totalInFile = data.counts.total
  const totalToImport = data.rows.length
  const countsMatch = totalInFile === totalToImport

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">{t('importConfirmTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('importConfirmSubtitle')}</p>
        </div>

        {/* Summary card */}
        <div className="p-4 bg-secondary/50 rounded-xl space-y-4">
          {/* Counts comparison */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('importOperationsInFile')}</span>
            <span className="font-bold text-lg">{totalInFile}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('importOperationsToImport')}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{totalToImport}</span>
              {countsMatch ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          </div>

          {/* Breakdown by type */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-green-500" />
                <span>{t('income')}</span>
              </div>
              <span>{data.counts.income}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-red-500" />
                <span>{t('expense')}</span>
              </div>
              <span>{data.counts.expense}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                <span>{t('transfer')}</span>
              </div>
              <span>{data.counts.transfer}</span>
            </div>
          </div>
        </div>

        {/* Warning if counts don't match */}
        {!countsMatch && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">{t('importCountMismatch')}</p>
                <p className="text-sm text-muted-foreground">{t('importCountMismatchHint')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation note */}
        {countsMatch && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-green-600">{t('importReadyToImport')}</p>
                <p className="text-sm text-muted-foreground">{t('importReadyToImportHint')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isImporting} className="flex-1">
          {t('back')}
        </Button>
        <Button onClick={onImport} disabled={isImporting || !countsMatch} className="flex-1">
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('importImporting')}
            </>
          ) : (
            t('importConfirmButton')
          )}
        </Button>
      </div>
    </div>
  )
}
