import { render, screen, within, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CurrencySelect } from './CurrencySelect'

// SelectContent always mounts its items (hidden via CSS when closed), so
// queries must be scoped to the trigger or the open panel to avoid matching
// the same currency text twice.
function openPanel(container: HTMLElement) {
  fireEvent.click(screen.getByRole('button'))
  return within(container.querySelector('.absolute')!)
}

describe('CurrencySelect', () => {
  it('shows the symbol and code for the selected currency', () => {
    render(<CurrencySelect value="USD" onValueChange={vi.fn()} />)

    expect(within(screen.getByRole('button')).getByText('$ USD')).toBeInTheDocument()
  })

  it('appends the currency name to each option when showName is set', () => {
    const { container } = render(<CurrencySelect value="USD" onValueChange={vi.fn()} showName />)

    expect(openPanel(container).getByText('$ USD - US Dollar')).toBeInTheDocument()
  })

  it('omits the currency name from options by default', () => {
    const { container } = render(<CurrencySelect value="USD" onValueChange={vi.fn()} />)

    expect(openPanel(container).queryByText(/US Dollar/)).not.toBeInTheDocument()
  })

  it('calls onValueChange with the selected currency code', () => {
    const onValueChange = vi.fn()
    const { container } = render(<CurrencySelect value="USD" onValueChange={onValueChange} />)

    fireEvent.click(openPanel(container).getByText('€ EUR'))

    expect(onValueChange).toHaveBeenCalledWith('EUR')
  })
})
