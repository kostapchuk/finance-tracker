import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColorPicker } from '@/components/ui/color-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { categoryRepo } from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import type { Category } from '@/database/types'
import { getRandomColor } from '@/utils/colors'

interface CategoryFormProps {
  category?: Category | null
  open: boolean
  onClose: () => void
}

export function CategoryForm({ category, open, onClose }: CategoryFormProps) {
  const refreshCategories = useAppStore((state) => state.refreshCategories)
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState('')
  const [color, setColor] = useState(getRandomColor())
  const [budget, setBudget] = useState('')
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly')

  useEffect(() => {
    if (category) {
      setName(category.name)
      setColor(category.color)
      setBudget(category.budget?.toString() || '')
      setBudgetPeriod(category.budgetPeriod || 'monthly')
    } else {
      setName('')
      setColor(getRandomColor())
      setBudget('')
      setBudgetPeriod('monthly')
    }
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const budgetValue = budget ? parseFloat(budget) : undefined
      if (category?.id) {
        await categoryRepo.update(category.id, {
          name: name.trim(),
          color,
          categoryType: 'expense',
          budget: budgetValue,
          budgetPeriod: budgetValue ? budgetPeriod : undefined,
        })
      } else {
        await categoryRepo.create({
          name: name.trim(),
          color,
          categoryType: 'expense',
          budget: budgetValue,
          budgetPeriod: budgetValue ? budgetPeriod : undefined,
        })
      }
      await refreshCategories()
      onClose()
    } catch (error) {
      console.error('Failed to save category:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? t('editCategory') : t('addCategory')}</DialogTitle>
        </DialogHeader>
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
              <Select value={budgetPeriod} onValueChange={(v) => setBudgetPeriod(v as typeof budgetPeriod)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPeriod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('monthly')}</SelectItem>
                  <SelectItem value="yearly">{t('yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('saving') : category ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
