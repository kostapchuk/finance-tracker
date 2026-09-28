import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BlurredAmount } from './BlurredAmount'

import { useAppStore } from '@/store/useAppStore'

afterEach(() => {
  useAppStore.setState({ blurFinancialFigures: false })
})

describe('BlurredAmount', () => {
  it('colors the amount by the sign of colorBySign', () => {
    render(
      <>
        <BlurredAmount colorBySign={5}>gain</BlurredAmount>
        <BlurredAmount colorBySign={-5}>loss</BlurredAmount>
        <BlurredAmount colorBySign={0}>even</BlurredAmount>
        <BlurredAmount className="text-sm">plain</BlurredAmount>
      </>
    )

    expect(screen.getByText('gain')).toHaveClass('text-success')
    expect(screen.getByText('loss')).toHaveClass('text-destructive')
    expect(screen.getByText('even')).toHaveClass('text-foreground')
    expect(screen.getByText('plain')).toHaveClass('text-sm')
    expect(screen.getByText('plain')).not.toHaveClass('text-foreground')
  })

  it('blurs the amount when financial figures are hidden', () => {
    useAppStore.setState({ blurFinancialFigures: true })
    render(<BlurredAmount>secret</BlurredAmount>)

    expect(screen.getByText('secret')).toHaveClass('blur-sm', 'select-none')
  })
})
