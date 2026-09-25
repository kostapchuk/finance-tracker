import type { PostHog, PostHogConfig, Properties } from 'posthog-js'

import { useAppStore } from '@/store/useAppStore'

// Injected at build time by the Deploy workflow from GitHub secrets. PostHog
// project tokens are write-only, so they are safe in the client bundle.
export const POSTHOG_TOKEN: string | undefined = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
export const POSTHOG_HOST: string | undefined = import.meta.env.VITE_POSTHOG_HOST

export const posthogOptions = {
  api_host: POSTHOG_HOST,
  defaults: '2026-05-30',
  // This is a finance app: never send on-screen text (amounts, names, comments)
  // or element attributes with autocaptured clicks or session replays.
  mask_all_text: true,
  mask_all_element_attributes: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '*',
  },
} as const satisfies Partial<PostHogConfig>

/**
 * Analytics is enabled only in production builds with a configured token,
 * and never under browser automation (Playwright/e2e runs).
 */
export function isAnalyticsEnabled({
  token = POSTHOG_TOKEN,
  isProd = import.meta.env.PROD,
  isAutomated = typeof navigator !== 'undefined' && navigator.webdriver,
}: { token?: string; isProd?: boolean; isAutomated?: boolean } = {}): boolean {
  return Boolean(token) && isProd && !isAutomated
}

/**
 * Product events used for PostHog funnels. Properties must never contain
 * amounts, names or comments — only coarse, non-identifying attributes.
 */
export type AnalyticsEvent =
  | 'view_changed'
  | 'account_created'
  | 'income_source_created'
  | 'category_created'
  | 'transaction_created'
  | 'loan_created'
  | 'loan_payment_recorded'
  | 'loan_fully_paid'

let client: PostHog | undefined
let pending: [AnalyticsEvent, Properties | undefined][] = []

/** Captures a custom event; events sent before PostHog loads are queued. */
export function trackEvent(event: AnalyticsEvent, properties?: Properties): void {
  if (client) {
    client.capture(event, properties)
  } else {
    pending.push([event, properties])
  }
}

/**
 * Loads PostHog in a separate chunk so it never blocks the app's first render.
 * The app has no URL routing, so view switches are tracked as custom events.
 */
export async function initAnalytics(enabled = isAnalyticsEnabled()): Promise<void> {
  if (!enabled || !POSTHOG_TOKEN) {
    pending = []
    return
  }
  const { default: posthog } = await import('posthog-js')
  posthog.init(POSTHOG_TOKEN, posthogOptions)
  client = posthog
  for (const [event, properties] of pending) posthog.capture(event, properties)
  pending = []

  useAppStore.subscribe((state, prev) => {
    if (state.activeView !== prev.activeView) {
      trackEvent('view_changed', { view: state.activeView })
    }
  })
}
