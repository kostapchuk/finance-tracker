import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'

interface BlurredAmountProps {
  children: React.ReactNode
  className?: string
}

export function BlurredAmount({ children, className }: BlurredAmountProps) {
  const blur = useAppStore((state) => state.blurFinancialFigures)
  return (
    <span className={cn(blur && 'blur-sm select-none', className)}>
      {children}
    </span>
  )
}
