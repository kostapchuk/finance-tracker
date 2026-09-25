import { useState } from 'react'

import { ColorAndVisibilityFields } from '@/components/ui/ColorAndVisibilityFields'
import { CurrencySelect } from '@/components/ui/CurrencySelect'
import { FormDialogFooter } from '@/components/ui/FormDialogFooter'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { incomeSourceRepo } from '@/database/repositories'
import type { IncomeSource } from '@/database/types'
import { useEntityFormFields } from '@/hooks/useEntityFormFields'
import { useLanguage } from '@/hooks/useLanguage'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useAppStore } from '@/store/useAppStore'
import { trackEvent } from '@/utils/analytics'

interface IncomeSourceFormProps {
  source?: IncomeSource
  open: boolean
  onClose: () => void
}

export function IncomeSourceForm({ source, open, onClose }: IncomeSourceFormProps) {
  const refreshIncomeSources = useAppStore((state) => state.refreshIncomeSources)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t } = useLanguage()

  const {
    name,
    setName,
    color,
    setColor,
    hiddenFromDashboard,
    setHiddenFromDashboard,
    isLoading,
    setIsLoading,
    resetFields,
  } = useEntityFormFields()
  const [currency, setCurrency] = useState(mainCurrency)

  useResetOnChange([source, open, mainCurrency], () => {
    resetFields(source)
    setCurrency(source ? source.currency || mainCurrency : mainCurrency)
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await (source?.id
        ? incomeSourceRepo.update(source.id, {
            name: name.trim(),
            currency,
            color,
            hiddenFromDashboard,
          })
        : incomeSourceRepo.create({
            name: name.trim(),
            currency,
            color,
            hiddenFromDashboard,
          }))
      if (!source?.id) trackEvent('income_source_created')
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
            <CurrencySelect
              id="currency"
              value={currency}
              onValueChange={setCurrency}
              placeholder={t('selectCurrency')}
              showName
            />
          </div>

          <ColorAndVisibilityFields
            color={color}
            onColorChange={setColor}
            hiddenFromDashboard={hiddenFromDashboard}
            onHiddenFromDashboardChange={setHiddenFromDashboard}
          />

          <FormDialogFooter isEditing={!!source} isLoading={isLoading} onCancel={onClose} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
