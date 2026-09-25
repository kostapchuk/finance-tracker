import { lazy, Suspense, useEffect } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { ServiceWorkerProvider } from '@/contexts/ServiceWorkerContext'
import { useAppStore } from '@/store/useAppStore'

const Dashboard = lazy(() =>
  import('@/features/dashboard/components/Dashboard').then((m) => ({ default: m.Dashboard }))
)
const HistoryPage = lazy(() =>
  import('@/features/transactions/components/HistoryPage').then((m) => ({ default: m.HistoryPage }))
)
const LoansPage = lazy(() =>
  import('@/features/loans/components/LoansPage').then((m) => ({ default: m.LoansPage }))
)
const ReportPage = lazy(() =>
  import('@/features/reports/components/ReportPage').then((m) => ({ default: m.ReportPage }))
)
const SettingsPage = lazy(() =>
  import('@/features/settings/components/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

function usePrefetchOnIdle() {
  useEffect(() => {
    if ('requestIdleCallback' in globalThis) {
      const idleCallbackId = requestIdleCallback(
        () => {
          const importers = {
            history: () => import('@/features/transactions/components/HistoryPage'),
            loans: () => import('@/features/loans/components/LoansPage'),
            report: () => import('@/features/reports/components/ReportPage'),
            settings: () => import('@/features/settings/components/SettingsPage'),
          } as const
          for (const [index, view] of Object.keys(importers).entries()) {
            setTimeout(() => {
              importers[view as keyof typeof importers]()
            }, index * 200)
          }
        },
        { timeout: 3000 }
      )
      return () => cancelIdleCallback(idleCallbackId)
    }
    return
  }, [])
}

function MainContent() {
  const activeView = useAppStore((state) => state.activeView)

  switch (activeView) {
    case 'dashboard': {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <Dashboard />
        </Suspense>
      )
    }
    case 'history': {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <HistoryPage />
        </Suspense>
      )
    }
    case 'loans': {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <LoansPage />
        </Suspense>
      )
    }
    case 'report': {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <ReportPage />
        </Suspense>
      )
    }
    case 'settings': {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <SettingsPage />
        </Suspense>
      )
    }
    default: {
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <Dashboard />
        </Suspense>
      )
    }
  }
}

export function App() {
  usePrefetchOnIdle()

  return (
    <ServiceWorkerProvider>
      <AppShell>
        <MainContent />
      </AppShell>
    </ServiceWorkerProvider>
  )
}
