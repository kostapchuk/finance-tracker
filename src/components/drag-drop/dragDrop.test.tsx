import { DndContext } from '@dnd-kit/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DraggableItem } from './DraggableItem'
import { DroppableZone } from './DroppableZone'

describe('drag and drop wrappers', () => {
  it('makes the whole element draggable in legacy mode', () => {
    render(
      <DndContext>
        <DroppableZone id="zone" data={{}} className="zone">
          <DraggableItem id="item" data={{ type: 'account' }} className="extra">
            <span>Wallet</span>
          </DraggableItem>
        </DroppableZone>
      </DndContext>
    )

    const draggable = screen.getByRole('button')
    expect(draggable).toHaveTextContent('Wallet')
    expect(draggable).toHaveClass('touch-none', 'extra')
    expect(draggable.parentElement).toHaveClass('zone')
  })

  it('passes drag handle props to a render function', () => {
    render(
      <DndContext>
        <DraggableItem id="item" data={{}}>
          {(handle) => (
            <button type="button" {...handle.attributes} data-dragging={handle.isDragging}>
              handle
            </button>
          )}
        </DraggableItem>
      </DndContext>
    )

    const handle = screen.getByText('handle')
    expect(handle).toHaveAttribute('aria-roledescription', 'draggable')
    expect(handle).toHaveAttribute('data-dragging', 'false')
  })
})
