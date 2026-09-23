import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { useLanguage } from '@/hooks/useLanguage'

interface FormDialogFooterProps {
  isEditing: boolean
  isLoading: boolean
  onCancel: () => void
  submitDisabled?: boolean
}

/**
 * The Cancel/Submit footer shared by AccountForm, CategoryForm,
 * IncomeSourceForm, and LoanForm: same "Saving.../Update/Create" logic,
 * just a different entity behind it.
 */
export function FormDialogFooter({
  isEditing,
  isLoading,
  onCancel,
  submitDisabled,
}: FormDialogFooterProps) {
  const { t } = useLanguage()

  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        {t('cancel')}
      </Button>
      <Button type="submit" disabled={isLoading || submitDisabled}>
        {isLoading ? t('saving') : isEditing ? t('update') : t('create')}
      </Button>
    </DialogFooter>
  )
}
