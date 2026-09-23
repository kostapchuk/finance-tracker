import { ColorAndVisibilityFields } from '@/components/ui/ColorAndVisibilityFields'
import { FormDialogFooter } from '@/components/ui/FormDialogFooter'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { categoryRepo } from '@/database/repositories'
import type { Category } from '@/database/types'
import { useEntityFormFields } from '@/hooks/useEntityFormFields'
import { useLanguage } from '@/hooks/useLanguage'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useAppStore } from '@/store/useAppStore'

interface CategoryFormProps {
  category?: Category | null
  open: boolean
  onClose: () => void
}

export function CategoryForm({ category, open, onClose }: CategoryFormProps) {
  const refreshCategories = useAppStore((state) => state.refreshCategories)
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

  useResetOnChange([category, open], () => resetFields(category))

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

          <ColorAndVisibilityFields
            color={color}
            onColorChange={setColor}
            hiddenFromDashboard={hiddenFromDashboard}
            onHiddenFromDashboardChange={setHiddenFromDashboard}
          />

          <FormDialogFooter isEditing={!!category} isLoading={isLoading} onCancel={onClose} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
