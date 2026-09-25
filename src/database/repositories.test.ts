import { beforeEach, describe, expect, it } from 'vitest'

import { db } from './db'
import {
  accountRepo,
  categoryRepo,
  customCurrencyRepo,
  incomeSourceRepo,
  loanRepo,
  settingsRepo,
  transactionRepo,
} from './repositories'
import type { Loan, Transaction } from './types'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

async function created(id: Promise<number | undefined>): Promise<number> {
  const value = await id
  if (value === undefined) throw new Error('expected the repository to return an id')
  return value
}

const names = (items: { name: string }[]) => items.map((item) => item.name)
const ids = (items: { id?: number }[]) => items.map((item) => item.id)

const account = {
  name: 'Wallet',
  type: 'cash' as const,
  currency: 'USD',
  balance: 100,
  color: '#000',
}

const loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'> = {
  type: 'given',
  personName: 'Alice',
  amount: 100,
  currency: 'USD',
  paidAmount: 0,
  status: 'active',
}

function expense(date: string, extra: Partial<Transaction> = {}) {
  return { type: 'expense' as const, amount: 1, currency: 'USD', date: new Date(date), ...extra }
}

describe('accountRepo', () => {
  it('supports CRUD and sorts by sortOrder, then name', async () => {
    const b = await created(accountRepo.create({ ...account, name: 'B' }))
    const a = await created(accountRepo.create({ ...account, name: 'A' }))
    const z = await created(accountRepo.create({ ...account, name: 'Z', sortOrder: 0 }))

    expect(names(await accountRepo.getAll())).toEqual(['Z', 'A', 'B'])
    await expect(accountRepo.getById(a)).resolves.toMatchObject({
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    })

    await accountRepo.update(b, { name: 'C' })
    await expect(accountRepo.getById(b)).resolves.toMatchObject({ name: 'C' })

    await accountRepo.delete(z)
    await expect(accountRepo.getById(z)).resolves.toBeUndefined()
  })

  it('adds amounts to the balance', async () => {
    const id = await created(accountRepo.create(account))

    await accountRepo.updateBalance(id, -30)
    await accountRepo.updateBalance(id, 5)

    await expect(accountRepo.getById(id)).resolves.toMatchObject({ balance: 75 })
  })

  it('ignores balance updates for unknown accounts', async () => {
    await expect(accountRepo.updateBalance(999, 10)).resolves.toBeUndefined()
  })
})

describe('incomeSourceRepo', () => {
  it('supports CRUD and sorts by sortOrder, then name', async () => {
    const source = { currency: 'USD', color: '#000' }
    const b = await created(incomeSourceRepo.create({ ...source, name: 'B' }))
    await incomeSourceRepo.create({ ...source, name: 'A' })
    const z = await created(incomeSourceRepo.create({ ...source, name: 'Z', sortOrder: 0 }))

    expect(names(await incomeSourceRepo.getAll())).toEqual(['Z', 'A', 'B'])

    await incomeSourceRepo.update(b, { name: 'C' })
    await expect(incomeSourceRepo.getById(b)).resolves.toMatchObject({ name: 'C' })

    await incomeSourceRepo.delete(z)
    await expect(incomeSourceRepo.getById(z)).resolves.toBeUndefined()
  })
})

describe('categoryRepo', () => {
  it('supports CRUD and sorts by sortOrder, then name', async () => {
    const b = await created(categoryRepo.create({ name: 'B', color: '#000' }))
    await categoryRepo.create({ name: 'A', color: '#000' })
    const z = await created(categoryRepo.create({ name: 'Z', color: '#000', sortOrder: 0 }))

    expect(names(await categoryRepo.getAll())).toEqual(['Z', 'A', 'B'])

    await categoryRepo.update(b, { name: 'C' })
    await expect(categoryRepo.getById(b)).resolves.toMatchObject({ name: 'C' })

    await categoryRepo.delete(z)
    await expect(categoryRepo.getById(z)).resolves.toBeUndefined()
  })
})

describe('transactionRepo', () => {
  it('queries by date, account, category and loan, newest first', async () => {
    const jan = await created(
      transactionRepo.create(expense('2026-01-10', { accountId: 1, categoryId: 1 }))
    )
    const feb = await created(
      transactionRepo.create(expense('2026-02-10', { accountId: 1, loanId: 7 }))
    )
    const mar = await created(
      transactionRepo.create(expense('2026-03-10', { accountId: 2, categoryId: 1 }))
    )

    expect(ids(await transactionRepo.getAll())).toEqual([mar, feb, jan])
    expect(
      ids(await transactionRepo.getByDateRange(new Date('2026-01-01'), new Date('2026-02-28')))
    ).toEqual([feb, jan])
    expect(ids(await transactionRepo.getByAccount(1))).toEqual([feb, jan])
    expect(ids(await transactionRepo.getByCategory(1))).toEqual([mar, jan])
    expect(ids(await transactionRepo.getByLoan(7))).toEqual([feb])
    expect(ids(await transactionRepo.getRecent(2))).toEqual([mar, feb])
    await expect(transactionRepo.getRecent()).resolves.toHaveLength(3)
  })

  it('updates and deletes', async () => {
    const id = await created(transactionRepo.create(expense('2026-01-10')))

    await transactionRepo.update(id, { amount: 42 })
    await expect(transactionRepo.getById(id)).resolves.toMatchObject({ amount: 42 })

    await transactionRepo.delete(id)
    await expect(transactionRepo.getById(id)).resolves.toBeUndefined()
  })
})

describe('loanRepo', () => {
  it('filters by status and type', async () => {
    const given = await created(loanRepo.create(loan))
    const received = await created(
      loanRepo.create({ ...loan, type: 'received', status: 'partially_paid' })
    )
    await loanRepo.create({ ...loan, status: 'fully_paid' })

    await expect(loanRepo.getAll()).resolves.toHaveLength(3)
    expect(ids(await loanRepo.getActive()).toSorted()).toEqual([given, received])
    expect(ids(await loanRepo.getByType('received'))).toEqual([received])
  })

  it('records payments and updates status', async () => {
    const id = await created(loanRepo.create(loan))

    await loanRepo.recordPayment(id, 40)
    await expect(loanRepo.getById(id)).resolves.toMatchObject({
      paidAmount: 40,
      status: 'partially_paid',
    })

    await loanRepo.recordPayment(id, 60)
    await expect(loanRepo.getById(id)).resolves.toMatchObject({
      paidAmount: 100,
      status: 'fully_paid',
    })
  })

  it('reverses payments and updates status, never going below zero', async () => {
    const id = await created(loanRepo.create({ ...loan, paidAmount: 100, status: 'fully_paid' }))

    await loanRepo.reversePayment(id, 0)
    await expect(loanRepo.getById(id)).resolves.toMatchObject({
      paidAmount: 100,
      status: 'fully_paid',
    })

    await loanRepo.reversePayment(id, 30)
    await expect(loanRepo.getById(id)).resolves.toMatchObject({
      paidAmount: 70,
      status: 'partially_paid',
    })

    await loanRepo.reversePayment(id, 500)
    await expect(loanRepo.getById(id)).resolves.toMatchObject({ paidAmount: 0, status: 'active' })
  })

  it('ignores payments on unknown loans', async () => {
    await expect(loanRepo.recordPayment(999, 1)).resolves.toBeUndefined()
    await expect(loanRepo.reversePayment(999, 1)).resolves.toBeUndefined()
  })

  it('updates and deletes', async () => {
    const id = await created(loanRepo.create(loan))

    await loanRepo.update(id, { personName: 'Bob' })
    await expect(loanRepo.getById(id)).resolves.toMatchObject({ personName: 'Bob' })

    await loanRepo.delete(id)
    await expect(loanRepo.getById(id)).resolves.toBeUndefined()
  })
})

describe('settingsRepo', () => {
  it('returns undefined and skips updates when nothing is stored', async () => {
    await expect(settingsRepo.get()).resolves.toBeUndefined()
    await expect(settingsRepo.update({ defaultCurrency: 'EUR' })).resolves.toBeUndefined()
  })

  it('creates and updates the single settings row', async () => {
    await settingsRepo.create({ defaultCurrency: 'USD' })
    await settingsRepo.update({ defaultCurrency: 'EUR' })

    await expect(settingsRepo.get()).resolves.toMatchObject({ defaultCurrency: 'EUR' })
  })
})

describe('customCurrencyRepo', () => {
  it('supports CRUD and sorts by code', async () => {
    const usdt = await created(
      customCurrencyRepo.create({ code: 'USDT', name: 'Tether', symbol: '₮' })
    )
    await customCurrencyRepo.create({ code: 'DOGE', name: 'Doge', symbol: 'Ð' })

    const currencies = await customCurrencyRepo.getAll()
    expect(currencies.map((c) => c.code)).toEqual(['DOGE', 'USDT'])

    await customCurrencyRepo.update(usdt, { symbol: 'T' })
    await expect(customCurrencyRepo.getById(usdt)).resolves.toMatchObject({ symbol: 'T' })

    await customCurrencyRepo.delete(usdt)
    await expect(customCurrencyRepo.getAll()).resolves.toHaveLength(1)
  })
})
