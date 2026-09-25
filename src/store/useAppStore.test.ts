import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useAppStore } from './useAppStore'

import type { AppVisit } from '@/database/types'

const {
  accountRepoMock,
  incomeSourceRepoMock,
  categoryRepoMock,
  transactionRepoMock,
  loanRepoMock,
  customCurrencyRepoMock,
  appVisitRepoMock,
  settingsRepoMock,
} = vi.hoisted(() => ({
  accountRepoMock: { getAll: vi.fn() },
  incomeSourceRepoMock: { getAll: vi.fn() },
  categoryRepoMock: { getAll: vi.fn() },
  transactionRepoMock: { getAll: vi.fn() },
  loanRepoMock: { getAll: vi.fn() },
  customCurrencyRepoMock: { getAll: vi.fn() },
  appVisitRepoMock: { getAll: vi.fn(), recordToday: vi.fn() },
  settingsRepoMock: { get: vi.fn(), update: vi.fn() },
}))

vi.mock('@/database/repositories', () => ({
  accountRepo: accountRepoMock,
  incomeSourceRepo: incomeSourceRepoMock,
  categoryRepo: categoryRepoMock,
  transactionRepo: transactionRepoMock,
  loanRepo: loanRepoMock,
  customCurrencyRepo: customCurrencyRepoMock,
  appVisitRepo: appVisitRepoMock,
  settingsRepo: settingsRepoMock,
}))

describe('useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Non-empty accounts -> "existing user" branch, skipping onboarding seed data.
    accountRepoMock.getAll.mockResolvedValue([{ id: 1 }])
    incomeSourceRepoMock.getAll.mockResolvedValue([])
    categoryRepoMock.getAll.mockResolvedValue([])
    transactionRepoMock.getAll.mockResolvedValue([])
    loanRepoMock.getAll.mockResolvedValue([])
    customCurrencyRepoMock.getAll.mockResolvedValue([])
    appVisitRepoMock.getAll.mockResolvedValue([])
    // recordToday and settingsRepo.get resolve undefined by default - nothing to configure.
  })

  describe('loadAllData', () => {
    it('records today before loading app visits into the store', async () => {
      const visits: AppVisit[] = [{ id: 1, date: '2026-03-15', createdAt: new Date() }]
      appVisitRepoMock.getAll.mockResolvedValue(visits)

      await useAppStore.getState().loadAllData()

      expect(appVisitRepoMock.recordToday).toHaveBeenCalledTimes(1)
      expect(useAppStore.getState().appVisits).toEqual(visits)
    })
  })

  describe('refreshAppVisits', () => {
    it('reloads app visits from the repository into the store', async () => {
      const visits: AppVisit[] = [{ id: 2, date: '2026-03-16', createdAt: new Date() }]
      appVisitRepoMock.getAll.mockResolvedValue(visits)

      await useAppStore.getState().refreshAppVisits()

      expect(useAppStore.getState().appVisits).toEqual(visits)
    })
  })
})
