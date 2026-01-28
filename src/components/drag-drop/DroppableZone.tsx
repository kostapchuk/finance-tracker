import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/utils/cn'

interface DroppableZoneProps {
  id: string
  data: Record<string, unknown>
  children: React.ReactNode
  className?: string
}

export function DroppableZone({ id, data, children, className }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-200',
        isOver && 'brightness-125',
        className
      )}
    >
      {children}
    </div>
  )
}
