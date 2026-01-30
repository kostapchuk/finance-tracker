import { useAppStore } from '@/store/useAppStore'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/features/dashboard/components/Dashboard'
import { HistoryPage } from '@/features/transactions/components/HistoryPage'
import { LoansPage } from '@/features/loans/components/LoansPage'
import { ReportPage } from '@/features/reports/components/ReportPage'
import { SettingsPage } from '@/features/settings/components/SettingsPage'

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
    <AppShell>
      <MainContent />
    </AppShell>
  )
}
