import { lazy, Suspense } from 'react'

import { AppShell } from '@/components/layout/AppShell'
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

function MainContent() {
  const activeView = useAppStore((state) => state.activeView)

  switch (activeView) {
    case 'dashboard':
      return <Dashboard />
    case 'history':
      return <HistoryPage />
    case 'loans':
      return <LoansPage />
    case 'report':
      return <ReportPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <Dashboard />
  }
}

export function App() {
  return (
    <ServiceWorkerProvider>
      <AppShell>
        <Suspense fallback={null}>
          <MainContent />
        </Suspense>
      </AppShell>
    </ServiceWorkerProvider>
  )
}
