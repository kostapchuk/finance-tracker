import { useEffect } from 'react'
import { BottomNav } from './BottomNav'
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay'
import { UpdatePrompt } from '@/components/ui/UpdatePrompt'
import { useAppStore } from '@/store/useAppStore'
import { setCustomCurrencies } from '@/utils/currency'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const loadAllData = useAppStore((state) => state.loadAllData)
  const customCurrencies = useAppStore((state) => state.customCurrencies)

  // Sync custom currencies with the utility
  useEffect(() => {
    setCustomCurrencies(customCurrencies.map(c => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
    })))
  }, [customCurrencies])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <UpdatePrompt />
      <main className="flex-1 overflow-auto pb-20 pt-safe">
        {children}
      </main>
      <BottomNav />
      <OnboardingOverlay />
    </div>
  )
}
