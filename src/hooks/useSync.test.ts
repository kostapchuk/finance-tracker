import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useSync } from './useSync'

const mockSyncAll = vi.fn()
const mockSubscribe = vi.fn()
const mockGetState = vi.fn()

vi.mock('@/database/syncService', () => ({
  useSyncState: () => mockGetState(),
  syncService: {
    syncAll: () => mockSyncAll(),
    subscribe: (callback: (state: unknown) => void) => mockSubscribe(callback),
    getState: () => mockGetState(),
  },
}))

describe('useSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetState.mockReturnValue({
      status: 'idle',
      lastSyncAt: null,
      pendingCount: 0,
      error: null,
      nextRetryAt: null,
    })
    mockSubscribe.mockReturnValue(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns sync state from useSyncState', () => {
    const { result } = renderHook(() => useSync())

    expect(result.current.status).toBe('idle')
    expect(result.current.pendingCount).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('returns isOffline based on navigator.onLine', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

    const { result } = renderHook(() => useSync())

    expect(result.current.isOffline).toBe(false)
  })

  it('returns isOffline as true when offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    const { result } = renderHook(() => useSync())

    expect(result.current.isOffline).toBe(true)
  })

  it('updates isOffline when online event fires', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    const { result } = renderHook(() => useSync())

    expect(result.current.isOffline).toBe(true)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

    act(() => {
      globalThis.dispatchEvent(new Event('online'))
    })

    expect(result.current.isOffline).toBe(false)
  })

  it('updates isOffline when offline event fires', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

    const { result } = renderHook(() => useSync())

    expect(result.current.isOffline).toBe(false)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    act(() => {
      globalThis.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isOffline).toBe(true)
  })

  it('calls syncService.syncAll when sync is called', async () => {
    mockSyncAll.mockResolvedValue(undefined)

    const { result } = renderHook(() => useSync())

    await act(async () => {
      await result.current.sync()
    })

    expect(mockSyncAll).toHaveBeenCalled()
  })

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(globalThis, 'removeEventListener')

    const { unmount } = renderHook(() => useSync())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
  })
})
