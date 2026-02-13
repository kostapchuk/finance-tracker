import {
  Banknote,
  Building2,
  Bitcoin,
  CreditCard,
  Wallet,
  ShoppingCart,
  Circle,
  type LucideIcon,
} from 'lucide-react'

const iconRegistry: Record<string, LucideIcon> = {
  Banknote,
  Building2,
  Bitcoin,
  CreditCard,
  Wallet,
  ShoppingCart,
  Circle,
}

export function getIcon(name: string | undefined, fallback: LucideIcon = Circle): LucideIcon {
  if (!name) return fallback
  return iconRegistry[name] ?? fallback
}
