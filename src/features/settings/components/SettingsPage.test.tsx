import type { DragEndEvent } from '@dnd-kit/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsPage } from './SettingsPage'

import {
  accountRepo,
  categoryRepo,
  customCurrencyRepo,
  incomeSourceRepo,
  loanRepo,
  transactionRepo,
} from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { created, resetDbAndStore } from '@/test/db'

const mocks = vi.hoisted(() => ({
  needRefresh: false,
  updateServiceWorker: vi.fn(),
  setLanguage: vi.fn(),
  onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined,
}))

vi.mock('@/contexts/ServiceWorkerContext', () => ({
  useServiceWorker: () => ({
    needRefresh: mocks.needRefresh,
    updateServiceWorker: mocks.updateServiceWorker,
  }),
}))

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: mocks.setLanguage, t: (key: string) => key }),
}))

// Capture the reorder handler so drag-end can be simulated without pointer events.
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: ComponentProps<typeof actual.DndContext>) => {
      mocks.onDragEnd = props.onDragEnd
      return <actual.DndContext {...props} />
    },
  }
})

let walletId: number
let bankId: number

beforeEach(async () => {
  await resetDbAndStore()
  localStorage.setItem('finance-tracker-onboarding-completed', 'true')
  mocks.needRefresh = false
  const account = { type: 'cash' as const, currency: 'USD', color: '#000' }
  walletId = await created(accountRepo.create({ ...account, name: 'Wallet', balance: 10 }))
  bankId = await created(accountRepo.create({ ...account, name: 'Bank', balance: 20 }))
  await categoryRepo.create({ name: 'Food', color: '#111' })
  await incomeSourceRepo.create({ name: 'Salary', currency: 'USD', color: '#222' })
  await customCurrencyRepo.create({ code: 'USDT', name: 'Tether', symbol: '₮' })
  await transactionRepo.create({
    type: 'expense',
    amount: 5,
    currency: 'USD',
    date: new Date(2026, 0, 1),
    accountId: walletId,
  })
  await loanRepo.create({
    type: 'given',
    personName: 'Al',
    amount: 1,
    currency: 'USD',
    paidAmount: 0,
    status: 'active',
  })
  await useAppStore.getState().loadAllData()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function drag(activeId: number, overId?: number) {
  mocks.onDragEnd?.({
    active: { id: activeId },
    over: overId === undefined ? undefined : { id: overId },
  } as unknown as DragEndEvent)
}

function openSection(label: string) {
  fireEvent.click(screen.getByText(label))
}

describe('SettingsPage main view', () => {
  it('shows counts and the app version', () => {
    render(<SettingsPage />)

    const accountsRow = screen.getByText('accounts').closest('button') as HTMLElement
    expect(within(accountsRow).getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/Finance Tracker v\d+\.\d+\.\d+/)).toBeInTheDocument()
    expect(screen.queryByText('updateAvailable')).not.toBeInTheDocument()
  })

  it('offers a pending app update', () => {
    mocks.needRefresh = true
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'updateNow' }))

    expect(mocks.updateServiceWorker).toHaveBeenCalled()
  })

  it('changes language, main currency and privacy mode', async () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'english' }))
    fireEvent.click(screen.getByRole('option', { name: 'russian' }))
    expect(mocks.setLanguage).toHaveBeenCalledWith('ru')

    fireEvent.click(screen.getByRole('button', { name: /BYN/ }))
    fireEvent.click(screen.getByRole('option', { name: '€ EUR' }))
    await waitFor(() => expect(useAppStore.getState().mainCurrency).toBe('EUR'))

    const privacy = screen.getByText('privacyMode').closest('div.flex.items-center.justify-between')
    fireEvent.click(within(privacy as HTMLElement).getByRole('button'))
    await waitFor(() => expect(useAppStore.getState().blurFinancialFigures).toBe(true))
  })

  it('exports a JSON backup', () => {
    const createObjectURL = vi.fn(() => 'blob:x')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<SettingsPage />)

    fireEvent.click(screen.getByText('exportBackup'))

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x')
    vi.unstubAllGlobals()
  })

  it('logs when the export fails', () => {
    vi.stubGlobal('URL', {
      createObjectURL: () => {
        throw new Error('no blobs')
      },
    })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SettingsPage />)

    fireEvent.click(screen.getByText('exportBackup'))

    expect(log).toHaveBeenCalledWith('Export failed:', expect.any(Error))
    vi.unstubAllGlobals()
  })

  it('restores a JSON backup, replacing existing data', async () => {
    const backup = {
      version: 1,
      accounts: [
        {
          id: 7,
          name: 'Restored',
          type: 'bank',
          currency: 'EUR',
          balance: 1,
          color: '#000',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      transactions: [],
    }
    render(<SettingsPage />)
    const input = document.querySelector('input[accept=".json"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [] } })
    fireEvent.change(input, {
      target: { files: [new File([JSON.stringify(backup)], 'backup.json')] },
    })

    expect(await screen.findByText('dataImportedSuccessfully')).toBeInTheDocument()
    expect(useAppStore.getState().accounts.map((a) => a.name)).toEqual(['Restored'])
    expect(useAppStore.getState().categories).toEqual([])
  })

  it('reports an invalid backup file', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SettingsPage />)
    const input = document.querySelector('input[accept=".json"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [new File(['{}'], 'bad.json')] } })

    expect(await screen.findByText('Invalid backup file format')).toBeInTheDocument()
    expect(useAppStore.getState().accounts).toHaveLength(2)
  })

  it('deletes all data after confirmation', async () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByText('deleteAllData'))
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('deleteAllData'))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.click(dialog.getByRole('button', { name: 'deleteAllData' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useAppStore.getState().accounts).toEqual([])
    expect(useAppStore.getState().transactions).toEqual([])
    // Custom currencies are kept
    expect(useAppStore.getState().customCurrencies).toHaveLength(1)
  })

  it('logs when clearing data fails', async () => {
    const { db } = await import('@/database/db')
    vi.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('locked'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SettingsPage />)

    fireEvent.click(screen.getByText('deleteAllData'))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'deleteAllData' })
    )

    await waitFor(() =>
      expect(log).toHaveBeenCalledWith('Failed to clear data:', expect.any(Error))
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens the BudgetOk import wizard and resumes a paused import', async () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByText('importFromBudgetOk'))
    expect(screen.getByText('importDropOrClick')).toBeInTheDocument()

    const csv = [
      'Operation type, Date,Account,Category,Subcategory,Amount, Currency,Amount_dop,Currency_dop,Comment',
      'Expense,20260101,Wallet,Food,,1,USD,,,',
    ].join('\n')
    const input = document.querySelector('input[accept=".csv"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File([csv], 'budget.csv')] } })
    fireEvent.click(await screen.findByRole('button', { name: 'importPause' }))

    expect(screen.getByText('importResume')).toBeInTheDocument()
    expect(screen.getByText('budget.csv')).toBeInTheDocument()
  })
})

describe('SettingsPage management sections', () => {
  it.each([
    ['accounts', 'manageAccounts', 'Wallet', 'addAccount'],
    ['categories', 'manageCategories', 'Food', 'addCategory'],
    ['incomeSources', 'manageIncomeSources', 'Salary', 'addIncomeSource'],
    ['currencies', 'manageCurrencies', '₮ USDT', 'addCurrency'],
  ])('lists %s and opens the add and edit forms', (row, title, item, addTitle) => {
    render(<SettingsPage />)
    openSection(row)

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(item)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('dialog', { name: addTitle })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/^edit/)
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('dangerZone')).toBeInTheDocument()
  })

  it.each([
    ['accounts', 'Wallet', 'accounts', 1],
    ['categories', 'Food', 'categories', 0],
    ['incomeSources', 'Salary', 'incomeSources', 0],
    ['currencies', '₮ USDT', 'customCurrencies', 0],
  ] as const)('deletes from %s only after confirmation', async (row, item, key, remaining) => {
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValueOnce(false).mockReturnValue(true)
    render(<SettingsPage />)
    openSection(row)

    const itemRow = screen.getByText(item).closest('.rounded-xl') as HTMLElement
    fireEvent.click(within(itemRow).getByRole('button', { name: 'Delete' }))
    expect(useAppStore.getState()[key].length).toBe(remaining + 1)

    fireEvent.click(within(itemRow).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(useAppStore.getState()[key]).toHaveLength(remaining))
    expect(confirm).toHaveBeenCalledWith('deleteItemConfirm')
  })

  it('shows empty states', async () => {
    const { db } = await import('@/database/db')
    await Promise.all(db.tables.map((table) => table.clear()))
    await useAppStore.getState().loadAllData()
    render(<SettingsPage />)

    for (const [row, message] of [
      ['accounts', 'noAccountsYet'],
      ['categories', 'noExpenseCategories'],
      ['incomeSources', 'noIncomeSources'],
      ['currencies', 'noCustomCurrencies'],
    ]) {
      openSection(row)
      expect(screen.getByText(message)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    }
  })

  it('persists a new order after drag and drop', async () => {
    render(<SettingsPage />)
    openSection('accounts')
    expect(screen.getAllByRole('button', { name: 'Drag to reorder' })).toHaveLength(2)
    const [first, second] = useAppStore.getState().accounts

    await act(async () => {
      drag(first.id!)
      drag(first.id!, first.id)
      drag(999, second.id)
    })
    await expect(accountRepo.getById(first.id!)).resolves.not.toHaveProperty('sortOrder')

    await act(async () => {
      drag(first.id!, second.id)
    })

    await waitFor(() =>
      expect(useAppStore.getState().accounts.map((a) => a.id)).toEqual([second.id, first.id])
    )
    expect([walletId, bankId]).toContain(first.id)
  })

  it.each([
    ['categories', categoryRepo],
    ['incomeSources', incomeSourceRepo],
  ] as const)('wires drag and drop for %s', async (row, repo) => {
    const update = vi.spyOn(repo, 'update')
    render(<SettingsPage />)
    openSection(row)
    const [item] =
      row === 'categories'
        ? useAppStore.getState().categories
        : useAppStore.getState().incomeSources

    await act(async () => {
      mocks.onDragEnd?.({
        active: { id: item.id },
        over: { id: item.id },
      } as unknown as DragEndEvent)
    })

    expect(update).not.toHaveBeenCalled()
  })
})
