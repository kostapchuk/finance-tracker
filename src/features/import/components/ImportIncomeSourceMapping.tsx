import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/hooks/useLanguage'
import type { IncomeSource } from '@/database/types'

interface ImportIncomeSourceMappingProps {
  uniqueIncomeSources: string[]
  incomeSources: IncomeSource[]
  mapping: Map<string, number>
  onMappingChange: (budgetOkName: string, incomeSourceId: number | null) => void
  onNext: () => void
  onBack: () => void
}

export function ImportIncomeSourceMapping({
  uniqueIncomeSources,
  incomeSources,
  mapping,
  onMappingChange,
  onNext,
  onBack,
}: ImportIncomeSourceMappingProps) {
  const { t } = useLanguage()

  const mappedCount = Array.from(mapping.values()).filter((v) => v !== null).length
  const allMapped = mappedCount === uniqueIncomeSources.length
  const canProceed = allMapped

  // Skip step if no income sources to map
  if (uniqueIncomeSources.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="text-lg font-semibold">{t('importNoIncomeSourcesNeeded')}</h2>
            <p className="text-sm text-muted-foreground">{t('importNoIncomeTransactions')}</p>
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            {t('back')}
          </Button>
          <Button onClick={onNext} className="flex-1">
            {t('importNext')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t('importMapIncomeSources')}</h2>
          <p className="text-sm text-muted-foreground">{t('importMapIncomeSourcesHint')}</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl">
          {allMapped ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-500" />
          )}
          <span className="text-sm">
            {mappedCount} / {uniqueIncomeSources.length} {t('importMapped')}
          </span>
        </div>

        {/* Mapping list */}
        <div className="space-y-3">
          {uniqueIncomeSources.map((budgetOkName) => {
            const mappedId = mapping.get(budgetOkName)
            const isMapped = mappedId !== undefined && mappedId !== null

            return (
              <div
                key={budgetOkName}
                className={`p-3 rounded-xl border ${
                  isMapped
                    ? 'bg-secondary/30 border-transparent'
                    : 'bg-destructive/5 border-destructive/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{budgetOkName}</span>
                    {isMapped ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                <Select
                  value={mappedId?.toString() ?? ''}
                  onValueChange={(value) =>
                    onMappingChange(budgetOkName, value ? parseInt(value, 10) : null)
                  }
                >
                  <SelectTrigger className={!isMapped ? 'border-destructive/50' : ''}>
                    <SelectValue placeholder={t('importSelectIncomeSource')}>
                      {mappedId
                        ? incomeSources.find((s) => s.id === mappedId)?.name
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {incomeSources.map((source) => (
                      <SelectItem key={source.id} value={source.id!.toString()}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: source.color }}
                          />
                          {source.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>

        {!allMapped && (
          <p className="text-sm text-destructive text-center">
            {t('importAllIncomeSourcesMustBeMapped')}
          </p>
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
