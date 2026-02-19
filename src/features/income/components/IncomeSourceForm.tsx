import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import { incomeSourceRepo } from '@/database/repositories'
import type { IncomeSource } from '@/database/types'
import { useSettings } from '@/hooks/useDataHooks'
import { useLanguage } from '@/hooks/useLanguage'
import { queryClient } from '@/lib/queryClient'
import { getRandomColor } from '@/utils/colors'
import { getAllCurrencies } from '@/utils/currency'

interface IncomeSourceFormProps {
  source?: IncomeSource | null
  open: boolean
  onClose: () => void
}

function IncomeSourceFormContent({
  source,
  onClose,
}: {
  source?: IncomeSource | null
  onClose: () => void
}) {
  const { data: settings } = useSettings()
  const mainCurrency = settings?.defaultCurrency || 'BYN'
  const { t } = useLanguage()

  const [name, setName] = useState(source?.name ?? '')
  const [currency, setCurrency] = useState(source?.currency ?? mainCurrency)
  const [color, setColor] = useState(source?.color ?? getRandomColor())
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(
    source?.hiddenFromDashboard ?? false
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      if (source?.id) {
        await incomeSourceRepo.update(source.id, {
          name: name.trim(),
          currency,
          color,
          hiddenFromDashboard,
        })
      } else {
        await incomeSourceRepo.create({
          name: name.trim(),
          currency,
          color,
          hiddenFromDashboard,
        })
      }
      // Update query cache directly
      const updatedSources = await incomeSourceRepo.getAll()
      queryClient.setQueryData(['incomeSources'], updatedSources)
      onClose()
    } catch (error) {
      console.error('Failed to save income source:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('egSalaryFreelance')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">{t('currency')}</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectCurrency')}>
              {getAllCurrencies().find((c) => c.code === currency)?.symbol} {currency}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getAllCurrencies().map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.code} - {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('color')}</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="flex items-center justify-between">
        <Label>{t('hideFromDashboard')}</Label>
        <Toggle checked={hiddenFromDashboard} onCheckedChange={setHiddenFromDashboard} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit">{source ? t('update') : t('create')}</Button>
      </div>
    </form>
  )
}

export function IncomeSourceForm({ source, open, onClose }: IncomeSourceFormProps) {
  const { t } = useLanguage()
  // Use key to force re-mount when source changes, ensuring initial state is reset
  const formKey = source?.id ?? 'new'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{source ? t('editIncomeSource') : t('addIncomeSource')}</DialogTitle>
        </DialogHeader>
        <IncomeSourceFormContent key={formKey} source={source} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
