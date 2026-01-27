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
        'flex flex-col items-center gap-1 p-2 rounded-xl',
        'active:scale-95',
        'transition-all duration-150 touch-target w-full'
      )}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color + '20' }}
      >
        {IconComponent && (
          <IconComponent
            className="h-5 w-5"
            style={{ color }}
          />
        )}
      </div>
      <div className="text-center w-full">
        <p className="text-sm text-muted-foreground truncate w-full">{name}</p>
        <p className={cn('text-xs font-semibold truncate w-full', getAmountColor())}>
          {formatCurrency(amount, currency)}
        </p>
      </div>
    </button>
  )
}
