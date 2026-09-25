import 'fake-indexeddb/auto'
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

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

const account = {
  name: 'Wallet',
  type: 'cash' as const,
  currency: 'USD',
  balance: 100,
  color: '#000',
}

describe('sortable repositories', () => {
  it.each([
    ['accountRepo', accountRepo, account],
    ['incomeSourceRepo', incomeSourceRepo, { name: 'Salary', currency: 'USD', color: '#000' }],
    ['categoryRepo', categoryRepo, { name: 'Food', color: '#000' }],
  ] as const)('%s supports CRUD and sorts by sortOrder, then name', async (_name, repo, base) => {
    const create = repo.create as (item: typeof base & { sortOrder?: number }) => Promise<number>
    const b = await create({ ...base, name: 'B' })
    const a = await create({ ...base, name: 'A' })
    const z = await create({ ...base, name: 'Z', sortOrder: 0 })

    expect((await repo.getAll()).map((i) => i.name)).toEqual(['Z', 'A', 'B'])

    const created = await repo.getById(a)
    expect(created?.createdAt).toBeInstanceOf(Date)
    expect(created?.updatedAt).toBeInstanceOf(Date)

    await repo.update(b, { name: 'C' })
    expect((await repo.getById(b))?.name).toBe('C')

    await repo.delete(z)
    expect(await repo.getById(z)).toBeUndefined()
    expect(await repo.getAll()).toHaveLength(2)
  })
})

describe('accountRepo.updateBalance', () => {
  it('adds the amount to the balance', async () => {
    const id = await accountRepo.create(account)

    await accountRepo.updateBalance(id, -30)
    await accountRepo.updateBalance(id, 5)

    expect((await accountRepo.getById(id))?.balance).toBe(75)
  })

  it('ignores unknown accounts', async () => {
    expect(await accountRepo.updateBalance(999, 10)).toBeUndefined()
  })
})

describe('transactionRepo', () => {
  const tx = (date: string, extra: Record<string, number> = {}) => ({
    type: 'expense' as const,
    amount: 1,
    currency: 'USD',
    date: new Date(date),
    ...extra,
  })

  it('queries by date, account, category and loan, newest first', async () => {
    const jan = await transactionRepo.create(tx('2026-01-10', { accountId: 1, categoryId: 1 }))
    const feb = await transactionRepo.create(tx('2026-02-10', { accountId: 1, loanId: 7 }))
    const mar = await transactionRepo.create(tx('2026-03-10', { accountId: 2, categoryId: 1 }))

    expect((await transactionRepo.getAll()).map((t) => t.id)).toEqual([mar, feb, jan])
    expect(
      (await transactionRepo.getByDateRange(new Date('2026-01-01'), new Date('2026-02-28'))).map(
        (t) => t.id
      )
    ).toEqual([feb, jan])
    expect((await transactionRepo.getByAccount(1)).map((t) => t.id)).toEqual([feb, jan])
    expect((await transactionRepo.getByCategory(1)).map((t) => t.id)).toEqual([mar, jan])
    expect((await transactionRepo.getByLoan(7)).map((t) => t.id)).toEqual([feb])
    expect((await transactionRepo.getRecent(2)).map((t) => t.id)).toEqual([mar, feb])
    expect(await transactionRepo.getRecent()).toHaveLength(3)
  })

  it('updates and deletes', async () => {
    const id = await transactionRepo.create(tx('2026-01-10'))

    await transactionRepo.update(id, { amount: 42 })
    expect((await transactionRepo.getById(id))?.amount).toBe(42)

    await transactionRepo.delete(id)
    expect(await transactionRepo.getById(id)).toBeUndefined()
  })
})

describe('loanRepo', () => {
  const loan = {
    type: 'given' as const,
    personName: 'Alice',
    amount: 100,
    currency: 'USD',
    paidAmount: 0,
    status: 'active' as const,
  }

  it('filters by status and type', async () => {
    const given = await loanRepo.create(loan)
    const received = await loanRepo.create({ ...loan, type: 'received', status: 'partially_paid' })
    await loanRepo.create({ ...loan, status: 'fully_paid' })

    expect((await loanRepo.getAll()).length).toBe(3)
    expect((await loanRepo.getActive()).map((l) => l.id).toSorted()).toEqual([given, received])
    expect((await loanRepo.getByType('received')).map((l) => l.id)).toEqual([received])
  })

  it('records payments and updates status', async () => {
    const id = await loanRepo.create(loan)

    await loanRepo.recordPayment(id, 40)
    expect(await loanRepo.getById(id)).toMatchObject({ paidAmount: 40, status: 'partially_paid' })

    await loanRepo.recordPayment(id, 60)
    expect(await loanRepo.getById(id)).toMatchObject({ paidAmount: 100, status: 'fully_paid' })
  })

  it('reverses payments and updates status, never going below zero', async () => {
    const id = await loanRepo.create({ ...loan, paidAmount: 100, status: 'fully_paid' })

    await loanRepo.reversePayment(id, 0)
    expect(await loanRepo.getById(id)).toMatchObject({ paidAmount: 100, status: 'fully_paid' })

    await loanRepo.reversePayment(id, 30)
    expect(await loanRepo.getById(id)).toMatchObject({ paidAmount: 70, status: 'partially_paid' })

    await loanRepo.reversePayment(id, 500)
    expect(await loanRepo.getById(id)).toMatchObject({ paidAmount: 0, status: 'active' })
  })

  it('ignores payments on unknown loans', async () => {
    expect(await loanRepo.recordPayment(999, 1)).toBeUndefined()
    expect(await loanRepo.reversePayment(999, 1)).toBeUndefined()
  })

  it('updates and deletes', async () => {
    const id = await loanRepo.create(loan)

    await loanRepo.update(id, { personName: 'Bob' })
    expect((await loanRepo.getById(id))?.personName).toBe('Bob')

    await loanRepo.delete(id)
    expect(await loanRepo.getById(id)).toBeUndefined()
  })
})

describe('settingsRepo', () => {
  it('returns undefined and skips updates when nothing is stored', async () => {
    expect(await settingsRepo.get()).toBeUndefined()
    expect(await settingsRepo.update({ defaultCurrency: 'EUR' })).toBeUndefined()
  })

  it('creates and updates the single settings row', async () => {
    await settingsRepo.create({ defaultCurrency: 'USD' })
    await settingsRepo.update({ defaultCurrency: 'EUR' })

    expect((await settingsRepo.get())?.defaultCurrency).toBe('EUR')
  })
})

describe('customCurrencyRepo', () => {
  it('supports CRUD and sorts by code', async () => {
    const usdt = await customCurrencyRepo.create({ code: 'USDT', name: 'Tether', symbol: '₮' })
    await customCurrencyRepo.create({ code: 'DOGE', name: 'Doge', symbol: 'Ð' })

    expect((await customCurrencyRepo.getAll()).map((c) => c.code)).toEqual(['DOGE', 'USDT'])

    await customCurrencyRepo.update(usdt, { symbol: 'T' })
    expect((await customCurrencyRepo.getById(usdt))?.symbol).toBe('T')

    await customCurrencyRepo.delete(usdt)
    expect(await customCurrencyRepo.getAll()).toHaveLength(1)
  })
})
