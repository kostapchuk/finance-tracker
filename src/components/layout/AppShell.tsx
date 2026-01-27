import { useEffect } from 'react'
import { BottomNav } from './BottomNav'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'
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
  const updateActivity = useAuthStore((state) => state.updateActivity)
  const checkAutoLock = useAuthStore((state) => state.checkAutoLock)

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  useEffect(() => {
    const handleActivity = () => {
      updateActivity()
    }

    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('scroll', handleActivity)

    const lockInterval = setInterval(checkAutoLock, 60000)

    return () => {
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      clearInterval(lockInterval)
    }
  }, [updateActivity, checkAutoLock])

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <main className="flex-1 overflow-auto pb-20 pt-safe">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
