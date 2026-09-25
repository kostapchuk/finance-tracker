import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

afterEach(() => {
  vi.useRealTimers()
})

function Controlled({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>Change details</DialogDescription>
        </DialogHeader>
        <input aria-label="name" />
        <DialogFooter>
          <button type="button">Save</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(<Controlled open={false} onOpenChange={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is labelled by its title, locks scrolling and focuses itself', () => {
    vi.useFakeTimers()
    render(<Controlled open onOpenChange={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Edit account' })
    expect(screen.getByText('Change details')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    act(() => vi.runAllTimers())
    expect(dialog).toHaveFocus()
  })

  it('closes via the close button, the backdrop and Escape', () => {
    const onOpenChange = vi.fn()
    const { container } = render(<Controlled open onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(container.querySelector('[class*="bg-black"]') as Element)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.keyDown(document, { key: 'Enter' })

    expect(onOpenChange).toHaveBeenCalledTimes(3)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('restores scrolling and focus when it closes', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    const { rerender } = render(<Controlled open onOpenChange={vi.fn()} />)
    rerender(<Controlled open={false} onOpenChange={vi.fn()} />)

    expect(document.body.style.overflow).toBe('')
    expect(opener).toHaveFocus()
    opener.remove()
  })

  it('traps Tab focus inside the dialog', () => {
    render(<Controlled open onOpenChange={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    const first = screen.getByRole('textbox', { name: 'name' })
    const last = screen.getByRole('button', { name: 'Close' })

    last.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(first).toHaveFocus()

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()

    screen.getByRole('button', { name: 'Save' }).focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    fireEvent.keyDown(dialog, { key: 'a' })
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
  })

  it('opens itself from a trigger when uncontrolled', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Hello</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('dialog', { name: 'Hello' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('wires an asChild trigger to the child element and forwards refs', () => {
    const onOpenChange = vi.fn()
    const ref = createRef<HTMLDivElement>()
    const callbackRef = vi.fn()

    const { rerender } = render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <a href="#x">Custom</a>
        </DialogTrigger>
        <DialogContent ref={ref}>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    fireEvent.click(screen.getByRole('link', { name: 'Custom' }))
    expect(onOpenChange).toHaveBeenCalledWith(true)

    rerender(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent ref={ref}>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(ref.current).toBe(screen.getByRole('dialog'))

    rerender(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent ref={callbackRef}>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(callbackRef).toHaveBeenCalledWith(screen.getByRole('dialog'))
  })

  it('throws when parts are used outside a Dialog', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<DialogTitle>Orphan</DialogTitle>)).toThrow(
      'useDialog must be used within a Dialog'
    )
    vi.restoreAllMocks()
  })
})
