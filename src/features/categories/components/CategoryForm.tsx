import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { categoryRepo } from '@/database/repositories'
import type { Category } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useAppStore } from '@/store/useAppStore'
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
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(false)

  useResetOnChange([category, open], () => {
    if (category) {
      setName(category.name)
      setColor(category.color)
      setHiddenFromDashboard(category.hiddenFromDashboard || false)
    } else {
      setName('')
      setColor(getRandomColor())
      setHiddenFromDashboard(false)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      if (category?.id) {
        await categoryRepo.update(category.id, {
          name: name.trim(),
          color,
          categoryType: 'expense',
          hiddenFromDashboard,
        })
      } else {
        await categoryRepo.create({
          name: name.trim(),
          color,
          categoryType: 'expense',
          hiddenFromDashboard,
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

          <div className="flex items-center justify-between">
            <Label>{t('hideFromDashboard')}</Label>
            <Toggle checked={hiddenFromDashboard} onCheckedChange={setHiddenFromDashboard} />
          </div>

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
