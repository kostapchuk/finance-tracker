import { icons, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/currency'

interface CategoryTileProps {
  name: string
  amount: number
  currency?: string
  color: string
  icon?: string
  type?: 'expense' | 'income' | 'investment' | 'loan'
  onClick?: () => void
}

export function CategoryTile({
  name,
  amount,
  currency = 'USD',
  color,
  icon,
  type: _type = 'expense',
  onClick,
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
        'flex flex-col items-center gap-2 p-3 rounded-xl',
        'bg-secondary/50 hover:bg-secondary active:scale-95',
        'transition-all duration-150 touch-target w-full'
      )}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color + '20' }}
      >
        {IconComponent && (
          <IconComponent
            className="h-6 w-6"
            style={{ color }}
          />
        )}
      </div>
      <div className="text-center w-full">
        <p className="text-xs text-muted-foreground truncate w-full">{name}</p>
        <p className={cn('text-base sm:text-sm font-semibold', getAmountColor())}>
          {formatCurrency(amount, currency)}
        </p>
      </div>
    </button>
  )
}
