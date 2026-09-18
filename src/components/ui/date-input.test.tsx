import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DateInput } from './date-input'

describe('DateInput', () => {
  it('formats the displayed value using the given language, not the browser locale', () => {
    render(<DateInput value="2026-09-18" onChange={vi.fn()} language="ru" placeholder="From" />)

    expect(screen.getByText('18.09.2026')).toBeInTheDocument()
  })

  it('formats the displayed value for English the same way regardless of device locale', () => {
    render(<DateInput value="2026-09-18" onChange={vi.fn()} language="en" placeholder="From" />)

    expect(screen.getByText('09/18/2026')).toBeInTheDocument()
  })

  it('shows the placeholder when no value is set', () => {
    render(<DateInput value="" onChange={vi.fn()} language="en" placeholder="From" />)

    expect(screen.getByText('From')).toBeInTheDocument()
  })

  it('propagates changes from the underlying native date input', () => {
    const onChange = vi.fn()
    render(<DateInput value="2026-09-18" onChange={onChange} language="en" placeholder="From" />)

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-20' } })

    expect(onChange).toHaveBeenCalledWith('2026-09-20')
  })
})
