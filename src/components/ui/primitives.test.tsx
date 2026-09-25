import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CategoryTile } from './CategoryTile'
import { ColorAndVisibilityFields } from './ColorAndVisibilityFields'
import { FormDialogFooter } from './FormDialogFooter'
import { LoadingSkeleton } from './LoadingSkeleton'
import { Button } from './button'
import { ColorPicker } from './color-picker'
import { Input } from './input'
import { Label } from './label'
import { Textarea } from './textarea'
import { Toggle } from './toggle'

import { PRESET_COLORS } from '@/utils/colors'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

describe('Button', () => {
  it('renders variants and forwards clicks', () => {
    const onClick = vi.fn()
    render(
      <Button variant="destructive" size="sm" className="extra" onClick={onClick}>
        Delete
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass('bg-destructive', 'extra')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalled()
  })

  it('falls back to the default variant and size', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('bg-primary', 'h-11', 'px-4')
  })
})

describe('Input, Label and Textarea', () => {
  it('render labelled form controls', () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" className="w-1" defaultValue="Bob" />
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" defaultValue="hi" />
      </>
    )

    expect(screen.getByLabelText('Name')).toHaveValue('Bob')
    expect(screen.getByLabelText('Note')).toHaveValue('hi')
  })
})

describe('Toggle', () => {
  it('reports the inverted state on click', () => {
    const onCheckedChange = vi.fn()
    const { rerender } = render(<Toggle checked onCheckedChange={onCheckedChange} />)

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggle)
    expect(onCheckedChange).toHaveBeenCalledWith(false)

    rerender(<Toggle />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(screen.getByRole('switch'))
  })
})

describe('ColorPicker', () => {
  it('marks the selected color and reports picks', () => {
    const onChange = vi.fn()
    render(<ColorPicker value={PRESET_COLORS[1]} onChange={onChange} />)

    expect(screen.getAllByRole('button')).toHaveLength(PRESET_COLORS.length)
    expect(screen.getByLabelText(`Select color ${PRESET_COLORS[1]}`)).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    fireEvent.click(screen.getByLabelText(`Select color ${PRESET_COLORS[2]}`))
    expect(onChange).toHaveBeenCalledWith(PRESET_COLORS[2])
  })
})

describe('ColorAndVisibilityFields', () => {
  it('wires the color picker and the dashboard toggle', () => {
    const onColorChange = vi.fn()
    const onHidden = vi.fn()
    render(
      <ColorAndVisibilityFields
        color={PRESET_COLORS[0]}
        onColorChange={onColorChange}
        hiddenFromDashboard={false}
        onHiddenFromDashboardChange={onHidden}
      />
    )

    fireEvent.click(screen.getByLabelText(`Select color ${PRESET_COLORS[3]}`))
    fireEvent.click(screen.getByRole('switch'))

    expect(onColorChange).toHaveBeenCalledWith(PRESET_COLORS[3])
    expect(onHidden).toHaveBeenCalledWith(true)
    expect(screen.getByText('hideFromDashboard')).toBeInTheDocument()
  })
})

describe('FormDialogFooter', () => {
  it.each([
    [{ isEditing: false, isLoading: false }, 'create'],
    [{ isEditing: true, isLoading: false }, 'update'],
    [{ isEditing: true, isLoading: true }, 'saving'],
  ])('labels the submit button for %o', (props, label) => {
    render(<FormDialogFooter {...props} onCancel={vi.fn()} />)

    expect(screen.getByRole('button', { name: label })).toHaveAttribute('type', 'submit')
  })

  it('cancels and can disable submission', () => {
    const onCancel = vi.fn()
    render(
      <FormDialogFooter isEditing={false} isLoading={false} onCancel={onCancel} submitDisabled />
    )

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(onCancel).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'create' })).toBeDisabled()
  })
})

describe('CategoryTile', () => {
  it('shows the name and formatted amount and handles clicks', () => {
    const onClick = vi.fn()
    render(
      <CategoryTile
        name="Food"
        amount={12.5}
        currency="USD"
        color="#f00"
        icon="ShoppingCart"
        onClick={onClick}
      />
    )

    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText(/12\.50/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('names the drag handle after the tile', () => {
    render(
      <CategoryTile name="Rent" amount={0} color="#0f0" dragHandleProps={{ role: 'button' }} />
    )

    expect(screen.getByLabelText('Rent')).toHaveClass('cursor-grab')
  })
})

describe('LoadingSkeleton', () => {
  it('renders a pulsing placeholder', () => {
    const { container } = render(<LoadingSkeleton />)

    expect(container.firstChild).toHaveClass('animate-pulse')
  })
})
