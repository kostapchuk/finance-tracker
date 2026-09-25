import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountForm } from './accounts/components/AccountForm'
import { CategoryForm } from './categories/components/CategoryForm'
import { IncomeSourceForm } from './income/components/IncomeSourceForm'
import { CurrencyForm } from './settings/components/CurrencyForm'

import {
  accountRepo,
  categoryRepo,
  customCurrencyRepo,
  incomeSourceRepo,
} from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { created, resetDbAndStore } from '@/test/db'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

beforeEach(async () => {
  await resetDbAndStore()
  useAppStore.setState({ mainCurrency: 'EUR' })
})

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function submit(label = 'create') {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

describe('AccountForm', () => {
  it('creates an account in the main currency by default', async () => {
    const onClose = vi.fn()
    render(<AccountForm open onClose={onClose} />)

    expect(screen.getByRole('dialog', { name: 'addAccount' })).toBeInTheDocument()
    type('name', '  Wallet  ')
    type('initialBalance', '12.5')
    fireEvent.click(screen.getByRole('button', { name: 'bankAccount' }))
    fireEvent.click(screen.getByRole('option', { name: 'cash' }))
    fireEvent.click(screen.getByRole('switch'))
    submit()

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(useAppStore.getState().accounts).toEqual([
      expect.objectContaining({
        name: 'Wallet',
        type: 'cash',
        currency: 'EUR',
        balance: 12.5,
        hiddenFromDashboard: true,
      }),
    ])
  })

  it('updates an existing account and treats a blank balance as zero', async () => {
    const id = await created(
      accountRepo.create({
        name: 'Old',
        type: 'crypto',
        currency: 'BTC',
        balance: 1,
        color: '#000',
      })
    )
    const account = await accountRepo.getById(id)
    const onClose = vi.fn()
    render(<AccountForm account={account} open onClose={onClose} />)

    expect(screen.getByLabelText('name')).toHaveValue('Old')
    expect(screen.getByRole('button', { name: 'cryptoWallet' })).toBeInTheDocument()
    type('name', 'New')
    type('initialBalance', '')
    submit('update')

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await expect(accountRepo.getById(id)).resolves.toMatchObject({
      name: 'New',
      balance: 0,
      currency: 'BTC',
    })
  })

  it('ignores a blank name', () => {
    const onClose = vi.fn()
    render(<AccountForm open onClose={onClose} />)

    type('name', '   ')
    fireEvent.submit(screen.getByRole('button', { name: 'create' }))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('logs and stays open when saving fails', async () => {
    const error = new Error('fail')
    vi.spyOn(accountRepo, 'create').mockRejectedValueOnce(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onClose = vi.fn()
    render(<AccountForm open onClose={onClose} />)

    type('name', 'Wallet')
    submit()

    await waitFor(() => expect(log).toHaveBeenCalledWith('Failed to save account:', error))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'create' })).toBeEnabled()
    log.mockRestore()
  })

  it('closes on cancel', () => {
    const onClose = vi.fn()
    render(<AccountForm open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('CategoryForm', () => {
  it('creates an expense category', async () => {
    const onClose = vi.fn()
    render(<CategoryForm open onClose={onClose} />)

    type('name', 'Food')
    submit()

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(useAppStore.getState().categories).toEqual([
      expect.objectContaining({
        name: 'Food',
        categoryType: 'expense',
        hiddenFromDashboard: false,
      }),
    ])
  })

  it('updates an existing category', async () => {
    const id = await created(categoryRepo.create({ name: 'Food', color: '#000' }))
    const category = await categoryRepo.getById(id)
    const onClose = vi.fn()
    render(<CategoryForm category={category} open onClose={onClose} />)

    expect(screen.getByRole('dialog', { name: 'editCategory' })).toBeInTheDocument()
    type('name', 'Groceries')
    submit('update')

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await expect(categoryRepo.getById(id)).resolves.toMatchObject({ name: 'Groceries' })
  })

  it('ignores a blank name and logs failures', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(categoryRepo, 'create').mockRejectedValueOnce(new Error('x'))
    const onClose = vi.fn()
    render(<CategoryForm open onClose={onClose} />)

    fireEvent.submit(screen.getByRole('button', { name: 'create' }))
    type('name', 'Food')
    submit()

    await waitFor(() => expect(log).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('IncomeSourceForm', () => {
  it('creates a source in the chosen currency', async () => {
    const onClose = vi.fn()
    render(<IncomeSourceForm open onClose={onClose} />)

    type('name', 'Salary')
    fireEvent.click(screen.getByLabelText('currency'))
    fireEvent.click(screen.getByRole('option', { name: '$ USD - US Dollar' }))
    submit()

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(useAppStore.getState().incomeSources).toEqual([
      expect.objectContaining({ name: 'Salary', currency: 'USD' }),
    ])
  })

  it('updates an existing source, defaulting a missing currency to the main one', async () => {
    const id = await created(incomeSourceRepo.create({ name: 'Job', currency: '', color: '#000' }))
    const source = await incomeSourceRepo.getById(id)
    const onClose = vi.fn()
    render(<IncomeSourceForm source={source} open onClose={onClose} />)

    type('name', 'Freelance')
    submit('update')

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await expect(incomeSourceRepo.getById(id)).resolves.toMatchObject({
      name: 'Freelance',
      currency: 'EUR',
    })
  })

  it('ignores a blank name and logs failures', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(incomeSourceRepo, 'create').mockRejectedValueOnce(new Error('x'))
    const onClose = vi.fn()
    render(<IncomeSourceForm open onClose={onClose} />)

    fireEvent.submit(screen.getByRole('button', { name: 'create' }))
    type('name', 'Salary')
    submit()

    await waitFor(() => expect(log).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('CurrencyForm', () => {
  it('creates an upper-cased currency and uses the code as the default symbol', async () => {
    const onClose = vi.fn()
    render(<CurrencyForm open onClose={onClose} />)

    type('currencyCode', 'usdt')
    type('currencyName', ' Tether ')
    submit()

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(useAppStore.getState().customCurrencies).toEqual([
      expect.objectContaining({ code: 'USDT', name: 'Tether', symbol: 'USDT' }),
    ])
  })

  it('updates an existing currency', async () => {
    const id = await created(customCurrencyRepo.create({ code: 'ABC', name: 'Abc', symbol: 'a' }))
    const currency = await customCurrencyRepo.getById(id)
    const onClose = vi.fn()
    render(<CurrencyForm currency={currency} open onClose={onClose} />)

    expect(screen.getByLabelText('currencyCode')).toHaveValue('ABC')
    type('symbolOptional', '₳')
    submit('update')

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await expect(customCurrencyRepo.getById(id)).resolves.toMatchObject({ symbol: '₳' })
  })

  it('requires a code and a name, and logs failures', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(customCurrencyRepo, 'create').mockRejectedValueOnce(new Error('x'))
    const onClose = vi.fn()
    render(<CurrencyForm open onClose={onClose} />)

    type('currencyCode', 'ABC')
    fireEvent.submit(screen.getByRole('button', { name: 'create' }))
    type('currencyName', 'Abc')
    submit()

    await waitFor(() => expect(log).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
