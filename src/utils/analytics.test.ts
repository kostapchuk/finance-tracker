import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isAnalyticsEnabled, posthogOptions } from './analytics'

describe('isAnalyticsEnabled', () => {
  it('is enabled in production with a token and no automation', () => {
    expect(isAnalyticsEnabled({ token: 'phc_token', isProd: true, isAutomated: false })).toBe(true)
  })

  it('is disabled without a token', () => {
    expect(isAnalyticsEnabled({ token: '', isProd: true, isAutomated: false })).toBe(false)
  })

  it('is disabled outside production builds', () => {
    expect(isAnalyticsEnabled({ token: 'phc_token', isProd: false, isAutomated: false })).toBe(
      false
    )
  })

  it('is disabled under browser automation', () => {
    expect(isAnalyticsEnabled({ token: 'phc_token', isProd: true, isAutomated: true })).toBe(false)
  })

  it('is disabled in the test environment by default', () => {
    expect(isAnalyticsEnabled()).toBe(false)
  })
})

describe('posthogOptions', () => {
  it('masks on-screen text and inputs to avoid leaking financial data', () => {
    expect(posthogOptions.mask_all_text).toBe(true)
    expect(posthogOptions.mask_all_element_attributes).toBe(true)
    expect(posthogOptions.session_recording.maskAllInputs).toBe(true)
    expect(posthogOptions.session_recording.maskTextSelector).toBe('*')
  })
})

const posthogMock = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }))
vi.mock('posthog-js', () => ({ default: posthogMock }))

describe('initAnalytics', () => {
  beforeEach(() => {
    vi.resetModules()
    posthogMock.init.mockClear()
    posthogMock.capture.mockClear()
    vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', 'phc_test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not load PostHog when disabled', async () => {
    const analytics = await import('./analytics')
    await analytics.initAnalytics(false)
    expect(posthogMock.init).not.toHaveBeenCalled()
  })

  it('initialises PostHog with privacy options and flushes queued events', async () => {
    const analytics = await import('./analytics')
    analytics.trackEvent('account_created', { a: 1 })
    await analytics.initAnalytics(true)

    expect(posthogMock.init).toHaveBeenCalledWith('phc_test', analytics.posthogOptions)
    expect(posthogMock.capture).toHaveBeenCalledWith('account_created', { a: 1 })

    analytics.trackEvent('category_created')
    expect(posthogMock.capture).toHaveBeenCalledWith('category_created', undefined)
  })

  it('tracks view changes from the store', async () => {
    const analytics = await import('./analytics')
    const { useAppStore } = await import('@/store/useAppStore')
    await analytics.initAnalytics(true)

    useAppStore.getState().setActiveView('loans')
    expect(posthogMock.capture).toHaveBeenCalledWith('view_changed', { view: 'loans' })
  })
})
