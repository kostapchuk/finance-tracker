import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { customCurrencyRepo } from '@/database/repositories'
import type { CustomCurrency } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'

interface CurrencyFormProps {
  currency?: CustomCurrency | null
  open: boolean
  onClose: () => void
}

function CurrencyFormContent({
  currency,
  onClose,
}: {
  currency?: CustomCurrency | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const [code, setCode] = useState(currency?.code ?? '')
  const [name, setName] = useState(currency?.name ?? '')
  const [symbol, setSymbol] = useState(currency?.symbol ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) return

    try {
      if (currency?.id) {
        await customCurrencyRepo.update(currency.id, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          symbol: symbol.trim() || code.trim().toUpperCase(),
        })
      } else {
        await customCurrencyRepo.create({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          symbol: symbol.trim() || code.trim().toUpperCase(),
        })
      }
      queryClient.invalidateQueries({ queryKey: ['customCurrencies'], refetchType: 'all' })
      onClose()
    } catch (error) {
      console.error('Failed to save currency:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">{t('currencyCode')}</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('egBYN')}
          maxLength={5}
          required
        />
        <p className="text-xs text-muted-foreground">{t('currencyCodeHint')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t('currencyName')}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('egBelarusianRuble')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="symbol">{t('symbolOptional')}</Label>
        <Input
          id="symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder={t('egSymbolBr')}
          maxLength={5}
        />
        <p className="text-xs text-muted-foreground">{t('symbolHint')}</p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit">{currency ? t('update') : t('create')}</Button>
      </div>
    </form>
  )
}

export function CurrencyForm({ currency, open, onClose }: CurrencyFormProps) {
  const { t } = useLanguage()
  // Use key to force re-mount when currency changes, ensuring initial state is reset
  const formKey = currency?.id ?? 'new'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currency ? t('editCurrency') : t('addCurrency')}</DialogTitle>
        </DialogHeader>
        <CurrencyFormContent key={formKey} currency={currency} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
