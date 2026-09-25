import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { appVisitRepo } from './repositories'

const toArrayMock = vi.fn()
const whereMock = vi.fn()
const addMock = vi.fn()

vi.mock('./db', () => ({
  db: {
    appVisits: {
      toArray: (...args: unknown[]) => toArrayMock(...args),
      where: (...args: unknown[]) => whereMock(...args),
      add: (...args: unknown[]) => addMock(...args),
    },
  },
}))

describe('appVisitRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 10, 30))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('getAll returns every recorded visit', async () => {
    const visits = [{ id: 1, date: '2026-03-01', createdAt: new Date(2026, 2, 1) }]
    toArrayMock.mockResolvedValue(visits)

    await expect(appVisitRepo.getAll()).resolves.toEqual(visits)
  })

  it('adds a visit for today when none is recorded yet', async () => {
    const firstMock = vi.fn() // resolves undefined by default -> no existing visit
    const equalsMock = vi.fn().mockReturnValue({ first: firstMock })
    whereMock.mockReturnValue({ equals: equalsMock })
    addMock.mockResolvedValue(1)

    await appVisitRepo.recordToday()

    expect(whereMock).toHaveBeenCalledWith('date')
    expect(equalsMock).toHaveBeenCalledWith('2026-03-15')
    expect(addMock).toHaveBeenCalledTimes(1)
    expect(addMock.mock.calls[0][0]).toMatchObject({ date: '2026-03-15' })
  })

  it('does not add a duplicate visit when today is already recorded', async () => {
    const firstMock = vi
      .fn()
      .mockResolvedValue({ id: 5, date: '2026-03-15', createdAt: new Date() })
    const equalsMock = vi.fn().mockReturnValue({ first: firstMock })
    whereMock.mockReturnValue({ equals: equalsMock })

    await appVisitRepo.recordToday()

    expect(addMock).not.toHaveBeenCalled()
  })
})
