import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Dashboard } from './Dashboard'

import type { TransactionMode } from '@/components/ui/QuickTransactionModal'
import {
  accountRepo,
  categoryRepo,
  incomeSourceRepo,
  transactionRepo,
} from '@/database/repositories'
import type { Account, Category, IncomeSource } from '@/database/types'
import { useAppStore } from '@/store/useAppStore'
import { created, resetDbAndStore } from '@/test/db'

const dnd = vi.hoisted(() => ({
  onDragStart: undefined as ((event: DragStartEvent) => void) | undefined,
  onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined,
}))

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

// Capture the drag handlers so drops can be simulated without pointer events.
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: ComponentProps<typeof actual.DndContext>) => {
      dnd.onDragStart = props.onDragStart
      dnd.onDragEnd = props.onDragEnd
      return <actual.DndContext {...props} />
    },
  }
})

// The modal has its own tests; here we only care which mode the dashboard opens.
vi.mock('@/components/ui/QuickTransactionModal', () => ({
  QuickTransactionModal: ({
    mode,
    preselectedAccountId,
    onClose,
  }: {
    mode: TransactionMode
    preselectedAccountId?: number
    onClose: () => void
  }) => (
    <div role="dialog" aria-label={`quick-${mode.type}`}>
      <span>account {preselectedAccountId ?? 'none'}</span>
      <button type="button" onClick={onClose}>
        close-modal
      </button>
    </div>
  ),
}))

let wallet: Account
let bank: Account
let food: Category
let salary: IncomeSource

async function get<T>(promise: Promise<T | undefined>): Promise<T> {
  const value = await promise
  if (!value) throw new Error('missing entity')
  return value
}

beforeEach(async () => {
  await resetDbAndStore()
  localStorage.clear()
  const account = { type: 'cash' as const, currency: 'USD', balance: 100, color: '#0' }
  wallet = await get(
    accountRepo.getById(await created(accountRepo.create({ ...account, name: 'Wallet' })))
  )
  bank = await get(
    accountRepo.getById(
      await created(accountRepo.create({ ...account, name: 'Bank', type: 'bank' }))
    )
  )
  await accountRepo.create({ ...account, name: 'Hidden', hiddenFromDashboard: true })
  food = await get(
    categoryRepo.getById(await created(categoryRepo.create({ name: 'Food', color: '#0' })))
  )
  await categoryRepo.create({ name: 'Debt', color: '#0', categoryType: 'loan' })
  salary = await get(
    incomeSourceRepo.getById(
      await created(
        incomeSourceRepo.create({ name: 'Salary', currency: 'USD', color: '#0', icon: 'Banknote' })
      )
    )
  )
  const now = new Date()
  await transactionRepo.create({
    type: 'income',
    amount: 1000,
    currency: 'USD',
    date: now,
    incomeSourceId: salary.id,
    accountId: wallet.id,
  })
  await transactionRepo.create({
    type: 'expense',
    amount: 40,
    currency: 'USD',
    date: now,
    categoryId: food.id,
    accountId: wallet.id,
  })
  await transactionRepo.create({
    type: 'expense',
    amount: 9,
    currency: 'EUR',
    mainCurrencyAmount: 10,
    date: now,
    categoryId: food.id,
    accountId: wallet.id,
  })
  await transactionRepo.create({
    type: 'expense',
    amount: 500,
    currency: 'USD',
    date: new Date(2000, 0, 1),
    categoryId: food.id,
  })
  useAppStore.setState({ mainCurrency: 'USD', selectedMonth: new Date() })
  const store = useAppStore.getState()
  await Promise.all([
    store.refreshAccounts(),
    store.refreshCategories(),
    store.refreshIncomeSources(),
    store.refreshTransactions(),
  ])
})

function drop(
  drag: Record<string, unknown> | undefined,
  over?: Record<string, unknown>,
  hasOver = true
) {
  act(() => {
    dnd.onDragStart?.({ active: { data: { current: drag } } } as unknown as DragStartEvent)
  })
  act(() => {
    dnd.onDragEnd?.({
      active: { data: { current: drag } },
      over: hasOver ? { data: { current: over } } : undefined,
    } as unknown as DragEndEvent)
  })
}

describe('Dashboard', () => {
  it('shows monthly totals and only visible items', () => {
    render(<Dashboard />)

    // Each total appears in its section header and on its tile
    expect(screen.getAllByText('1,000.00 $')).toHaveLength(2)
    // 40 USD + the EUR expense converted to 10 USD; the old expense is out of range
    expect(screen.getAllByText('50.00 $')).toHaveLength(2)
    expect(screen.getByText('Wallet')).toBeInTheDocument()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    expect(screen.queryByText('Debt')).not.toBeInTheDocument()
  })

  it('collapses sections and remembers the income preference', () => {
    const { unmount } = render(<Dashboard />)

    fireEvent.click(screen.getByText('income'))
    fireEvent.click(screen.getByText('expenses'))
    expect(screen.queryByText('Salary')).not.toBeInTheDocument()
    expect(screen.queryByText('Food')).not.toBeInTheDocument()
    expect(localStorage.getItem('incomeExpanded')).toBe('false')
    unmount()

    render(<Dashboard />)
    expect(screen.queryByText('Salary')).not.toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
  })

  it('navigates to filtered history from a category or account', () => {
    render(<Dashboard />)

    fireEvent.click(screen.getByText('Food'))
    expect(useAppStore.getState()).toMatchObject({
      activeView: 'history',
      historyCategoryFilter: food.id,
    })

    fireEvent.click(screen.getByText('Bank'))
    expect(useAppStore.getState().historyAccountFilter).toBe(bank.id)
  })

  it('opens the add forms', async () => {
    render(<Dashboard />)

    for (const [label, title] of [
      ['addIncomeSource', 'addIncomeSource'],
      ['addAccount', 'addAccount'],
      ['addCategory', 'addCategory'],
    ]) {
      fireEvent.click(screen.getAllByRole('button', { name: label })[0])
      const dialog = await screen.findByRole('dialog', { name: title })
      fireEvent.click(within(dialog).getByRole('button', { name: 'cancel' }))
    }
  })

  it('records income when a source is dropped on an account and advances onboarding', async () => {
    useAppStore.setState({ onboardingStep: 2 })
    render(<Dashboard />)

    act(() => {
      dnd.onDragStart?.({
        active: { data: { current: { type: 'income', source: salary } } },
      } as unknown as DragStartEvent)
    })
    expect(screen.getByText('dropIncomeHere')).toBeInTheDocument()

    drop({ type: 'income', source: salary }, { type: 'account', account: bank })

    expect(await screen.findByRole('dialog', { name: 'quick-income' })).toHaveTextContent(
      `account ${bank.id}`
    )
    expect(useAppStore.getState().onboardingStep).toBe(3)

    fireEvent.click(screen.getByText('close-modal'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('records an expense when an account is dropped on a category', async () => {
    useAppStore.setState({ onboardingStep: 3 })
    render(<Dashboard />)

    act(() => {
      dnd.onDragStart?.({
        active: { data: { current: { type: 'account', account: wallet } } },
      } as unknown as DragStartEvent)
    })
    expect(screen.getAllByText('dropHere')).toHaveLength(2)

    drop({ type: 'account', account: wallet }, { type: 'category', category: food })

    expect(await screen.findByRole('dialog', { name: 'quick-expense' })).toHaveTextContent(
      `account ${wallet.id}`
    )
    expect(useAppStore.getState().onboardingStep).toBe(4)
  })

  it('transfers between two different accounts', async () => {
    render(<Dashboard />)

    drop({ type: 'account', account: wallet }, { type: 'account', account: bank })

    expect(await screen.findByRole('dialog', { name: 'quick-transfer' })).toHaveTextContent(
      'account none'
    )
  })

  it('ignores drops that do not make a transaction', () => {
    useAppStore.setState({ onboardingStep: 0 })
    render(<Dashboard />)

    drop({ type: 'account', account: wallet }, { type: 'account', account: wallet })
    drop({ type: 'account', account: wallet }, undefined, false)
    drop({ type: 'account', account: wallet })
    drop(undefined, { type: 'account', account: bank })
    drop({ type: 'income', source: salary }, { type: 'category', category: food })
    drop({ type: 'other' }, { type: 'account', account: bank })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useAppStore.getState().onboardingStep).toBe(0)
  })

  it('does not change onboarding outside the drag tutorial steps', async () => {
    useAppStore.setState({ onboardingStep: 0 })
    render(<Dashboard />)

    drop({ type: 'income', source: salary }, { type: 'account', account: bank })
    drop({ type: 'account', account: wallet }, { type: 'category', category: food })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(useAppStore.getState().onboardingStep).toBe(0)
  })

  it('renders a drag preview with a fallback icon', () => {
    render(<Dashboard />)

    act(() => {
      dnd.onDragStart?.({
        active: { data: { current: { type: 'account', account: { ...bank, icon: undefined } } } },
      } as unknown as DragStartEvent)
    })
    act(() => {
      dnd.onDragStart?.({
        active: { data: { current: { type: 'income', source: { ...salary, icon: undefined } } } },
      } as unknown as DragStartEvent)
    })

    expect(screen.getByText('dropIncomeHere')).toBeInTheDocument()
  })
})
