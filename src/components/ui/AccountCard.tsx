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
}: AccountCardProps) {
  const iconName = icon || defaultIcons[type] || 'Wallet'
  const IconComponent: LucideIcon = iconName in icons
    ? icons[iconName as keyof typeof icons]
    : icons.Wallet

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 p-4 rounded-xl',
        'active:scale-95',
        'transition-all duration-150 touch-target',
        'flex flex-col items-center gap-2 w-full'
      )}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color + '20' }}
      >
        <IconComponent className="h-7 w-7" style={{ color }} />
      </div>
      <div className="text-center w-full">
        <p className="text-sm text-muted-foreground truncate w-full">{name}</p>
        <p className="text-xs font-semibold text-foreground truncate w-full">
          {formatCurrency(balance, currency)}
        </p>
      </div>
    </button>
  )
}
