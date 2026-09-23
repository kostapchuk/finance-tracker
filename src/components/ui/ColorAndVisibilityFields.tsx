import { ColorPicker } from '@/components/ui/color-picker'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { useLanguage } from '@/hooks/useLanguage'

interface ColorAndVisibilityFieldsProps {
  color: string
  onColorChange: (color: string) => void
  hiddenFromDashboard: boolean
  onHiddenFromDashboardChange: (hidden: boolean) => void
}

/**
 * The color picker + "hide from dashboard" toggle shared by AccountForm,
 * CategoryForm, and IncomeSourceForm.
 */
export function ColorAndVisibilityFields({
  color,
  onColorChange,
  hiddenFromDashboard,
  onHiddenFromDashboardChange,
}: ColorAndVisibilityFieldsProps) {
  const { t } = useLanguage()

  return (
    <>
      <div className="space-y-2">
        <Label>{t('color')}</Label>
        <ColorPicker value={color} onChange={onColorChange} />
      </div>

      <div className="flex items-center justify-between">
        <Label>{t('hideFromDashboard')}</Label>
        <Toggle checked={hiddenFromDashboard} onCheckedChange={onHiddenFromDashboardChange} />
      </div>
    </>
  )
}
