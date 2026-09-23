import { render, screen, within, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AccountSelect } from './AccountSelect'

import type { Account } from '@/database/types'

const accounts: Account[] = [
  {
    id: 1,
    name: 'Wallet',
    type: 'cash',
    currency: 'USD',
    balance: 100,
    color: '#000',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Bank',
    type: 'bank',
    currency: 'EUR',
    balance: 200,
    color: '#111',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// SelectContent always mounts its items (hidden via CSS when closed), so
// queries must be scoped to the trigger or the open panel to avoid matching
// the same account text twice.
function openPanel(container: HTMLElement) {
  fireEvent.click(screen.getByRole('button'))
  return within(container.querySelector('.absolute')!)
}

describe('AccountSelect', () => {
  it('shows the name and currency of the selected account', () => {
    render(
      <AccountSelect accounts={accounts} value="1" onValueChange={vi.fn()} placeholder="Pick" />
    )

    expect(within(screen.getByRole('button')).getByText('Wallet (USD)')).toBeInTheDocument()
  })

  it('lists every account with its currency', () => {
    const { container } = render(
      <AccountSelect accounts={accounts} value="1" onValueChange={vi.fn()} placeholder="Pick" />
    )
    const panel = openPanel(container)

    expect(panel.getByText('Wallet (USD)')).toBeInTheDocument()
    expect(panel.getByText('Bank (EUR)')).toBeInTheDocument()
  })

  it('calls onValueChange with the selected account id', () => {
    const onValueChange = vi.fn()
    const { container } = render(
      <AccountSelect
        accounts={accounts}
        value="1"
        onValueChange={onValueChange}
        placeholder="Pick"
      />
    )

    fireEvent.click(openPanel(container).getByText('Bank (EUR)'))

    expect(onValueChange).toHaveBeenCalledWith('2')
  })
})
