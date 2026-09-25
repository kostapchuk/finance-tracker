import { useMemo } from 'react'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/currency'
import { getIcon } from '@/utils/icons'

interface CategoryTileProps {
  name: string
  amount: number
  currency?: string
  color: string
  icon?: string
  type?: 'expense' | 'income' | 'loan'
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
  const IconComponent = useMemo(() => getIcon(icon), [icon])

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
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          dragHandleProps && 'touch-none cursor-grab'
        )}
        style={{ backgroundColor: color + '20' }}
        {...dragHandleProps}
        // dnd-kit applies role="button" here, but the handle holds only an icon.
        // Name it after the tile so it is not an anonymous control. Must follow
        // the spread so it is not overwritten by the drag attributes.
        aria-label={dragHandleProps ? name : undefined}
      >
        {IconComponent && <IconComponent className="h-6 w-6" style={{ color }} />}
      </div>
      <div className="text-center w-full min-w-0 overflow-hidden">
        <p className="text-sm text-muted-foreground truncate">{name}</p>
        <BlurredAmount className="text-xs font-semibold truncate block text-foreground">
          {formatCurrency(amount, currency)}
        </BlurredAmount>
      </div>
    </button>
  )
}
