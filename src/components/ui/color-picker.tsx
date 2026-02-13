import { cn } from '@/utils/cn'
import { PRESET_COLORS } from '@/utils/colors'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('grid grid-cols-7 sm:grid-cols-9 gap-2 sm:gap-1', className)}>
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Select color ${color}`}
          aria-pressed={value === color}
          className={cn(
            'w-10 h-10 sm:w-6 sm:h-6 rounded-full transition-transform hover:scale-110',
            value === color && 'ring-2 ring-offset-2 ring-primary'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
