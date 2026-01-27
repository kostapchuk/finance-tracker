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
        'flex-shrink-0 w-32 p-3 rounded-xl',
        'bg-secondary/50 hover:bg-secondary active:scale-95',
        'transition-all duration-150 touch-target',
        'flex flex-col items-start gap-2'
      )}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color + '20' }}
      >
        <IconComponent className="h-4 w-4" style={{ color }} />
      </div>
      <div className="text-left w-full">
        <p className="text-xs text-muted-foreground truncate">{name}</p>
        <p className="text-sm font-bold text-foreground">
          {formatCurrency(balance, currency)}
        </p>
      </div>
    </button>
  )
}
