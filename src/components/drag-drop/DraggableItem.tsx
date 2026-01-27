import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/utils/cn'

interface DraggableItemProps {
  id: string
  data: Record<string, unknown>
  children: React.ReactNode
  className?: string
}

export function DraggableItem({ id, data, children, className }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50 z-50 scale-105',
        className
      )}
    >
      {children}
    </div>
  )
}
