import { useQueryClient } from '@tanstack/react-query'
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
import { categoryRepo } from '@/database/repositories'
import type { Category } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { getRandomColor } from '@/utils/colors'

interface CategoryFormProps {
  category?: Category | null
  open: boolean
  onClose: () => void
}

function CategoryFormContent({
  category,
  onClose,
}: {
  category?: Category | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? getRandomColor())
  const [budget, setBudget] = useState(category?.budget?.toString() ?? '')
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'weekly' | 'yearly'>(
    category?.budgetPeriod ?? 'monthly'
  )
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(
    category?.hiddenFromDashboard ?? false
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const budgetValue = budget ? parseFloat(budget) : undefined
      if (category?.id) {
        await categoryRepo.update(category.id, {
          name: name.trim(),
          color,
          categoryType: 'expense',
          budget: budgetValue,
          budgetPeriod: budgetValue ? budgetPeriod : undefined,
          hiddenFromDashboard,
        })
      } else {
        await categoryRepo.create({
          name: name.trim(),
          color,
          categoryType: 'expense',
          budget: budgetValue,
          budgetPeriod: budgetValue ? budgetPeriod : undefined,
          hiddenFromDashboard,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['categories'], refetchType: 'all' })
      onClose()
    } catch (error) {
      console.error('Failed to save category:', error)
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
          placeholder={t('egGroceries')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{t('color')}</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">{t('budgetOptional')}</Label>
        <Input
          id="budget"
          type="number"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder={t('leaveEmptyForNoBudget')}
        />
      </div>

      {budget && (
        <div className="space-y-2">
          <Label htmlFor="budgetPeriod">{t('budgetPeriod')}</Label>
          <Select
            value={budgetPeriod}
            onValueChange={(v) => setBudgetPeriod(v as typeof budgetPeriod)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectPeriod')}>
                {budgetPeriod === 'weekly'
                  ? t('weekly')
                  : budgetPeriod === 'monthly'
                    ? t('monthly')
                    : t('yearly')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t('weekly')}</SelectItem>
              <SelectItem value="monthly">{t('monthly')}</SelectItem>
              <SelectItem value="yearly">{t('yearly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label>{t('hideFromDashboard')}</Label>
        <Toggle checked={hiddenFromDashboard} onCheckedChange={setHiddenFromDashboard} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit">{category ? t('update') : t('create')}</Button>
      </div>
    </form>
  )
}

export function CategoryForm({ category, open, onClose }: CategoryFormProps) {
  const { t } = useLanguage()
  // Use key to force re-mount when category changes, ensuring initial state is reset
  const formKey = category?.id ?? 'new'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? t('editCategory') : t('addCategory')}</DialogTitle>
        </DialogHeader>
        <CategoryFormContent key={formKey} category={category} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
