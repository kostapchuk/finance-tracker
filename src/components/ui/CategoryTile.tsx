import { icons, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/currency'
import { BlurredAmount } from '@/components/ui/BlurredAmount'

interface CategoryTileProps {
  name: string
  amount: number
  currency?: string
  color: string
  icon?: string
  type?: 'expense' | 'income' | 'investment' | 'loan'
  onClick?: () => void
  dragHandleProps?: Record<string, unknown>
}

export function CategoryTile({
  name,
  amount,
  currency = 'USD',
  color,
  icon,
  onClick,
  dragHandleProps,
}: CategoryTileProps) {
  // Get icon component from lucide-react
  const IconComponent: LucideIcon = icon && icon in icons
    ? icons[icon as keyof typeof icons]
    : icons.Circle

  // Get color based on amount and type
  const getAmountColor = () => {
    return 'text-foreground'
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-xl',
        'active:scale-95',
        'transition-all duration-150 touch-target w-full'
      )}
    >
      <div
        className={cn("w-12 h-12 rounded-full flex items-center justify-center", dragHandleProps && "touch-none cursor-grab")}
        style={{ backgroundColor: color + '20' }}
        {...dragHandleProps}
      >
        {IconComponent && (
          <IconComponent
            className="h-6 w-6"
            style={{ color }}
          />
        )}
      </div>
      <div className="text-center w-full min-w-0 overflow-hidden">
        <p className="text-sm text-muted-foreground truncate">{name}</p>
        <BlurredAmount className={cn('text-xs font-semibold truncate block', getAmountColor())}>
          {formatCurrency(amount, currency)}
        </BlurredAmount>
      </div>
    </button>
  )
}
