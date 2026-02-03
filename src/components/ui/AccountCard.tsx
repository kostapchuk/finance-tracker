import { icons, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/currency'
import type { AccountType } from '@/database/types'

interface AccountCardProps {
  name: string
  type: AccountType
  balance: number
  currency: string
  color: string
  icon?: string
  onClick?: () => void
  dragHandleProps?: Record<string, unknown>
}

const defaultIcons: Record<AccountType, keyof typeof icons> = {
  cash: 'Banknote',
  bank: 'Building2',
  crypto: 'Bitcoin',
  investment: 'TrendingUp',
  credit_card: 'CreditCard',
}

export function AccountCard({
  name,
  type,
  balance,
  currency,
  color,
  icon,
  onClick,
  dragHandleProps,
}: AccountCardProps) {
  const iconName = icon || defaultIcons[type] || 'Wallet'
  const IconComponent: LucideIcon = iconName in icons
    ? icons[iconName as keyof typeof icons]
    : icons.Wallet

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 p-2 rounded-xl min-w-20 max-w-24',
        'active:scale-95',
        'transition-all duration-150 touch-target',
        'flex flex-col items-center gap-1'
      )}
    >
      <div
        className={cn("w-12 h-12 rounded-full flex items-center justify-center", dragHandleProps && "touch-none cursor-grab")}
        style={{ backgroundColor: color + '20' }}
        {...dragHandleProps}
      >
        <IconComponent className="h-6 w-6" style={{ color }} />
      </div>
      <div className="text-center w-full min-w-0 overflow-hidden">
        <p className="text-sm text-muted-foreground truncate">{name}</p>
        <p className="text-xs font-semibold text-foreground truncate">
          {formatCurrency(balance, currency)}
        </p>
      </div>
    </button>
  )
}
