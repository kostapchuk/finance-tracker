import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/utils/cn'

export interface DragHandleProps {
  ref: React.Ref<HTMLElement>
  listeners: Record<string, unknown>
  attributes: Record<string, unknown> & { role?: string; tabIndex?: number }
  isDragging: boolean
}

interface DraggableItemProps {
  id: string
  data: Record<string, unknown>
  children: React.ReactNode | ((handle: DragHandleProps) => React.ReactNode)
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

  // Render prop mode: only the icon gets drag listeners
  if (typeof children === 'function') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          isDragging && 'opacity-50 z-50 scale-105',
          className
        )}
      >
        {children({ ref: setNodeRef, listeners: listeners ?? {}, attributes: { ...attributes }, isDragging })}
      </div>
    )
  }

  // Legacy mode: entire element is draggable
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
