import {
  AlertCircle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  FileText,
} from 'lucide-react'

import type { ParsedImportData } from '../types'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'

interface ImportDataPreviewProps {
  data: ParsedImportData
  fileName: string
  onNext: () => void
  onBack: () => void
}

export function ImportDataPreview({ data, fileName, onNext, onBack }: ImportDataPreviewProps) {
  const { t } = useLanguage()
  const hasErrors = data.errors.length > 0
  const canProceed = !hasErrors && data.rows.length > 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* File info */}
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{fileName}</p>
            <p className="text-sm text-muted-foreground">
              {data.counts.total} {t('importOperations')}
            </p>
          </div>
          {!hasErrors ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>

        {/* Stats by type */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            icon={ArrowDown}
            label={t('income')}
            count={data.counts.income}
            color="text-green-500"
          />
          <StatCard
            icon={ArrowUp}
            label={t('expense')}
            count={data.counts.expense}
            color="text-red-500"
          />
          <StatCard
            icon={ArrowLeftRight}
            label={t('transfer')}
            count={data.counts.transfer}
            color="text-blue-500"
          />
        </div>

        {/* Unique items summary */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            {t('importUniqueItems')}
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">{t('accounts')}:</span>{' '}
              {data.uniqueAccounts.length}
            </p>
            <p>
              <span className="text-muted-foreground">{t('categories')}:</span>{' '}
              {data.uniqueCategories.length}
            </p>
            <p>
              <span className="text-muted-foreground">{t('incomeSources')}:</span>{' '}
              {data.uniqueIncomeSources.length}
            </p>
          </div>
        </div>

        {/* Parse errors */}
        {hasErrors && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-destructive uppercase">
              {t('importParseErrors')} ({data.errors.length})
            </h3>
            <div className="max-h-48 overflow-auto space-y-2">
              {data.errors.map((error, i) => (
                <div
                  key={i}
                  className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm"
                >
                  <p className="font-medium text-destructive">
                    {t('importLine')} {error.lineNumber}: {error.message}
                  </p>
                  <p className="text-muted-foreground truncate mt-1 font-mono text-xs">
                    {error.rawLine}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-destructive">{t('importFixErrorsBeforeProceeding')}</p>
          </div>
        )}

        {/* Sample data preview */}
        {!hasErrors && data.rows.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              {t('importPreviewSample')}
            </h3>
            <div className="space-y-1 text-sm max-h-48 overflow-auto">
              {data.rows.slice(0, 5).map((row, i) => (
                <div key={i} className="p-2 bg-secondary/30 rounded-lg font-mono text-xs">
                  <span
                    className={
                      row.operationType === 'Income'
                        ? 'text-green-500'
                        : row.operationType === 'Expense'
                          ? 'text-red-500'
                          : 'text-blue-500'
                    }
                  >
                    {row.operationType}
                  </span>{' '}
                  | {row.date.toLocaleDateString()} | {row.account} → {row.category} | {row.amount}{' '}
                  {row.currency}
                </div>
              ))}
              {data.rows.length > 5 && (
                <p className="text-muted-foreground text-center py-1">
                  ... {t('importAndMore').replace('{count}', String(data.rows.length - 5))}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          {t('back')}
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1">
          {t('importNext')}
        </Button>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  color: string
}) {
  return (
    <div className="p-3 bg-secondary/50 rounded-xl text-center">
      <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
