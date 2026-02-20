import { lazy, Suspense, useEffect } from 'react'

import { MigrationDialog } from '@/components/MigrationDialog'
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
          const views = ['history', 'loans', 'report', 'settings']
          views.forEach((view, index) => {
            setTimeout(() => {
              const importer =
                view === 'history'
                  ? () => import('@/features/transactions/components/HistoryPage')
                  : view === 'loans'
                    ? () => import('@/features/loans/components/LoansPage')
                    : view === 'report'
                      ? () => import('@/features/reports/components/ReportPage')
                      : () => import('@/features/settings/components/SettingsPage')
              importer()
            }, index * 200)
          })
        },
        { timeout: 3000 }
      )
      return () => cancelIdleCallback(idleCallbackId)
    }
    return undefined
  }, [])
}

function MainContent() {
  const activeView = useAppStore((state) => state.activeView)

  switch (activeView) {
    case 'dashboard':
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <Dashboard />
        </Suspense>
      )
    case 'history':
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <HistoryPage />
        </Suspense>
      )
    case 'loans':
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <LoansPage />
        </Suspense>
      )
    case 'report':
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <ReportPage />
        </Suspense>
      )
    case 'settings':
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <SettingsPage />
        </Suspense>
      )
    default:
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <Dashboard />
        </Suspense>
      )
  }
}

export function App() {
  usePrefetchOnIdle()

  return (
    <ServiceWorkerProvider>
      <MigrationDialog />
      <AppShell>
        <MainContent />
      </AppShell>
    </ServiceWorkerProvider>
  )
}
