import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AmountInput } from './amount-input'

describe('AmountInput', () => {
  it('shows the currency symbol and a decimal text input', () => {
    const onChange = vi.fn()
    render(<AmountInput currencySymbol="€" aria-label="amount" value="" onChange={onChange} />)

    const input = screen.getByRole('textbox', { name: 'amount' })
    expect(screen.getByText('€')).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    expect(input).toHaveClass('pl-8', 'text-lg')
    expect(input).not.toHaveClass('h-12')

    fireEvent.change(input, { target: { value: '12.5' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('renders a taller input and symbol for the large size and forwards refs', () => {
    const ref = createRef<HTMLInputElement>()
    render(<AmountInput ref={ref} currencySymbol="$" size="lg" aria-label="amount" />)

    const input = screen.getByRole('textbox', { name: 'amount' })
    expect(ref.current).toBe(input)
    expect(input).toHaveClass('h-12')
    expect(screen.getByText('$')).toHaveClass('text-lg')
  })
})
