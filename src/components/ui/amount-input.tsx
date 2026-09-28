import * as React from 'react'

import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/utils/cn'

const sizeClasses = {
  default: { symbol: '', input: 'pl-8 text-lg' },
  lg: { symbol: 'text-lg', input: 'pl-8 text-lg h-12' },
} as const

export interface AmountInputProps extends Omit<InputProps, 'size'> {
  currencySymbol: string
  size?: keyof typeof sizeClasses
}

/** Money input with the currency symbol rendered inside its left edge. */
const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ currencySymbol, size = 'default', className, ...props }, ref) => {
    return (
      <div className="relative">
        <span
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground',
            sizeClasses[size].symbol
          )}
        >
          {currencySymbol}
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          className={cn(sizeClasses[size].input, className)}
          {...props}
        />
      </div>
    )
  }
)
AmountInput.displayName = 'AmountInput'

export { AmountInput }
