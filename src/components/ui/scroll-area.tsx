import * as React from 'react'

import { cn } from '@/utils/cn'

type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
      <div className="h-full w-full overflow-auto">{children}</div>
    </div>
  )
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
