import { lazy, Suspense, useEffect } from 'react'

import { BottomNav } from './BottomNav'

import { useCustomCurrencies } from '@/hooks/useDataHooks'
import { useAppStore } from '@/store/useAppStore'
import { setCustomCurrencies } from '@/utils/currency'

const OnboardingOverlay = lazy(() =>
  import('@/components/onboarding/OnboardingOverlay').then((m) => ({
    default: m.OnboardingOverlay,
  }))
)

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const loadAllData = useAppStore((state) => state.loadAllData)
  const onboardingStep = useAppStore((state) => state.onboardingStep)
  const { data: customCurrencies = [] } = useCustomCurrencies()

  useEffect(() => {
    setCustomCurrencies(
      customCurrencies.map((c) => ({
        code: c.code,
        name: c.name,
        symbol: c.symbol,
      }))
    )
  }, [customCurrencies])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <main className="flex-1 overflow-auto pb-20 pt-safe">{children}</main>
      <BottomNav />
      {onboardingStep > 0 && (
        <Suspense fallback={null}>
          <OnboardingOverlay />
        </Suspense>
      )}
    </div>
  )
}
