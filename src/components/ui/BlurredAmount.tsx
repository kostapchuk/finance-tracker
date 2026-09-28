import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { getAmountColorClass } from '@/utils/currency'

interface BlurredAmountProps {
  children: React.ReactNode
  className?: string
  /** Colors the amount by the sign of this value: positive, negative or zero */
  colorBySign?: number
}

export function BlurredAmount({ children, className, colorBySign }: BlurredAmountProps) {
  const blur = useAppStore((state) => state.blurFinancialFigures)
  return (
    <span
      className={cn(
        blur && 'blur-sm select-none',
        colorBySign !== undefined && getAmountColorClass(colorBySign),
        className
      )}
    >
      {children}
    </span>
  )
}
