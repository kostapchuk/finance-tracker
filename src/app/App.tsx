import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { AppShell } from '@/components/layout/AppShell'
import { PassphraseSetup } from '@/features/auth/components/PassphraseSetup'
import { PassphraseEntry } from '@/features/auth/components/PassphraseEntry'
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
  const { isAuthenticated, isSetupComplete, isLoading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSetupComplete) {
    return <PassphraseSetup />
  }

  if (!isAuthenticated) {
    return <PassphraseEntry />
  }

  return (
    <AppShell>
      <MainContent />
    </AppShell>
  )
}
