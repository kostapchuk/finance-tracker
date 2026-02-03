import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColorPicker } from '@/components/ui/color-picker'
import { Toggle } from '@/components/ui/toggle'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { incomeSourceRepo } from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import type { IncomeSource } from '@/database/types'
import { getAllCurrencies } from '@/utils/currency'
import { getRandomColor } from '@/utils/colors'

interface IncomeSourceFormProps {
  source?: IncomeSource | null
  open: boolean
  onClose: () => void
}

export function IncomeSourceForm({ source, open, onClose }: IncomeSourceFormProps) {
  const refreshIncomeSources = useAppStore((state) => state.refreshIncomeSources)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState(mainCurrency)
  const [color, setColor] = useState(getRandomColor())
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(false)

  useEffect(() => {
    if (source) {
      setName(source.name)
      setCurrency(source.currency || mainCurrency)
      setColor(source.color)
      setHiddenFromDashboard(source.hiddenFromDashboard || false)
    } else {
      setName('')
      setCurrency(mainCurrency)
      setColor(getRandomColor())
      setHiddenFromDashboard(false)
    }
  }, [source, open, mainCurrency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
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
      await refreshIncomeSources()
      onClose()
    } catch (error) {
      console.error('Failed to save income source:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{source ? t('editIncomeSource') : t('addIncomeSource')}</DialogTitle>
        </DialogHeader>
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
                <SelectValue placeholder={t('selectCurrency')} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('saving') : source ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
