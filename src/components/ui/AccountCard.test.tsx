import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AccountCard } from './AccountCard'

describe('AccountCard', () => {
  it('renders the balance with tabular-nums so digits do not shift width', () => {
    render(<AccountCard name="Cash" type="cash" balance={1234.56} currency="USD" color="#000000" />)

    expect(screen.getByText(/1[\s,.]234[\s,.]56/)).toHaveClass('tabular-nums')
  })
})
