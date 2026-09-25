import { describe, it, expect } from 'vitest'

import { buildBackupData, parseBackupData } from './backup'

import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  CustomCurrency,
} from '@/database/types'

// Simulates what an exported backup looks like after being written to a
// file and read back: Dates become ISO strings, unlike structuredClone.
function throughJsonFile(data: unknown): unknown {
  const text = JSON.stringify(data)
  return JSON.parse(text)
}

const account: Account = {
  id: 7,
  name: 'Wallet',
  type: 'cash',
  currency: 'USD',
  balance: 100,
  color: '#000',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const incomeSource: IncomeSource = {
  id: 3,
  name: 'Salary',
  currency: 'USD',
  color: '#111',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const category: Category = {
  id: 12,
  name: 'Groceries',
  color: '#222',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

// id deliberately has a gap relative to accounts/categories/incomeSources
// above, mirroring what happens after any prior delete in the app.
const transaction: Transaction = {
  id: 40,
  type: 'income',
  amount: 500,
  currency: 'USD',
  date: new Date('2026-01-02'),
  accountId: 7,
  incomeSourceId: 3,
  createdAt: new Date('2026-01-02'),
  updatedAt: new Date('2026-01-02'),
}

const loan: Loan = {
  id: 5,
  type: 'given',
  personName: 'Alex',
  amount: 200,
  currency: 'USD',
  paidAmount: 0,
  status: 'active',
  accountId: 7,
  createdAt: new Date('2026-01-03'),
  updatedAt: new Date('2026-01-03'),
}

const customCurrency: CustomCurrency = {
  id: 2,
  code: 'XAU',
  name: 'Gold',
  symbol: 'Au',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const fullBackup = {
  accounts: [account],
  incomeSources: [incomeSource],
  categories: [category],
  transactions: [transaction],
  loans: [loan],
  customCurrencies: [customCurrency],
}

describe('backup utilities', () => {
  describe('buildBackupData', () => {
    it('includes version, exportedAt and all entity arrays including customCurrencies', () => {
      const data = buildBackupData(fullBackup)
      expect(data.version).toBe(1)
      expect(typeof data.exportedAt).toBe('string')
      expect(data.accounts).toEqual([account])
      expect(data.customCurrencies).toEqual([customCurrency])
    })
  })

  describe('parseBackupData', () => {
    it('throws on invalid input missing required fields', () => {
      expect(() => parseBackupData({})).toThrow('Invalid backup file format')
      expect(() => parseBackupData()).toThrow('Invalid backup file format')
      expect(() => parseBackupData({ version: 1, accounts: [] })).toThrow(
        'Invalid backup file format'
      )
    })

    it('round-trips a full export/import cycle preserving ids and foreign keys', () => {
      const exported = buildBackupData(fullBackup)
      const json = throughJsonFile(exported)
      const parsed = parseBackupData(json)

      // IDs must be preserved, not regenerated, otherwise transaction /
      // loan foreign keys would point at the wrong records after import.
      expect(parsed.accounts[0].id).toBe(account.id)
      expect(parsed.transactions[0].id).toBe(transaction.id)
      expect(parsed.transactions[0].accountId).toBe(account.id)
      expect(parsed.transactions[0].incomeSourceId).toBe(incomeSource.id)
      expect(parsed.loans[0].accountId).toBe(account.id)
      expect(parsed.customCurrencies[0].id).toBe(customCurrency.id)
    })

    it('converts date strings back into Date instances', () => {
      const exported = buildBackupData(fullBackup)
      const json = throughJsonFile(exported)
      const parsed = parseBackupData(json)

      expect(parsed.accounts[0].createdAt).toBeInstanceOf(Date)
      expect(parsed.transactions[0].date).toBeInstanceOf(Date)
      expect(parsed.transactions[0].date.getTime()).toBe(transaction.date.getTime())
    })

    it('handles an older backup file with no customCurrencies field', () => {
      const legacy = {
        version: 1,
        exportedAt: new Date().toISOString(),
        accounts: [account],
        incomeSources: [incomeSource],
        categories: [category],
        transactions: [transaction],
        loans: [loan],
      }
      const parsed = parseBackupData(throughJsonFile(legacy))
      expect(parsed.customCurrencies).toEqual([])
    })

    it('handles a loan with no dueDate without throwing', () => {
      const loanWithoutDueDate = { ...loan, dueDate: undefined }
      const data = buildBackupData({ ...fullBackup, loans: [loanWithoutDueDate] })
      const parsed = parseBackupData(throughJsonFile(data))
      expect(parsed.loans[0].dueDate).toBeUndefined()
    })
  })
})
