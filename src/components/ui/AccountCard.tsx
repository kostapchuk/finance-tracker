import { Wallet } from 'lucide-react'
import { useMemo } from 'react'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import type { AccountType } from '@/database/types'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/currency'
import { getIcon } from '@/utils/icons'

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

const defaultIcons: Record<AccountType, string> = {
  cash: 'Banknote',
  bank: 'Building2',
  crypto: 'Bitcoin',
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
  const IconComponent = useMemo(() => getIcon(iconName, Wallet), [iconName])

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
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          dragHandleProps && 'touch-none cursor-grab'
        )}
        style={{ backgroundColor: color + '20' }}
        {...dragHandleProps}
      >
        <IconComponent className="h-6 w-6" style={{ color }} />
      </div>
      <div className="text-center w-full min-w-0 overflow-hidden">
        <p className="text-sm text-muted-foreground truncate">{name}</p>
        <BlurredAmount className="text-xs font-semibold text-foreground truncate block">
          {formatCurrency(balance, currency)}
        </BlurredAmount>
      </div>
    </button>
  )
}
