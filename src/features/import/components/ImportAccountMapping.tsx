import { AlertCircle, CheckCircle2 } from 'lucide-react'

import type { SourceAccountInfo } from '../types'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Account } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'

interface ImportAccountMappingProps {
  uniqueAccounts: SourceAccountInfo[]
  accounts: Account[]
  mapping: Map<string, number>
  onMappingChange: (budgetOkName: string, accountId: number | null) => void
  onNext: () => void
  onBack: () => void
}

export function ImportAccountMapping({
  uniqueAccounts,
  accounts,
  mapping,
  onMappingChange,
  onNext,
  onBack,
}: ImportAccountMappingProps) {
  const { t } = useLanguage()

  const mappedCount = [...mapping.values()].filter((v) => v !== null).length
  const allMapped = mappedCount === uniqueAccounts.length
  const canProceed = allMapped

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t('importMapAccounts')}</h2>
          <p className="text-sm text-muted-foreground">{t('importMapAccountsHint')}</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl">
          {allMapped ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-500" />
          )}
          <span className="text-sm">
            {mappedCount} / {uniqueAccounts.length} {t('importMapped')}
          </span>
        </div>

        {/* Mapping list */}
        <div className="space-y-3">
          {uniqueAccounts.map((sourceAccount) => {
            const mappedId = mapping.get(sourceAccount.name)
            const isMapped = mappedId !== undefined && mappedId !== null

            return (
              <div
                key={sourceAccount.name}
                className={`p-3 rounded-xl border ${
                  isMapped
                    ? 'bg-secondary/30 border-transparent'
                    : 'bg-destructive/5 border-destructive/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sourceAccount.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({sourceAccount.currency})
                    </span>
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
                    onMappingChange(sourceAccount.name, value ? parseInt(value, 10) : null)
                  }
                >
                  <SelectTrigger className={!isMapped ? 'border-destructive/50' : ''}>
                    <SelectValue placeholder={t('selectAccount')}>
                      {mappedId ? accounts.find((a) => a.id === mappedId)?.name : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id!.toString()}>
                        {account.name} ({account.currency})
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
            {t('importAllAccountsMustBeMapped')}
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
