import { LayoutDashboard, Clock, HandCoins, PieChart, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import type { TranslationKey } from '@/utils/i18n'

const navItems: { id: 'dashboard' | 'history' | 'loans' | 'report' | 'settings', labelKey: TranslationKey, icon: typeof LayoutDashboard }[] = [
  { id: 'report', labelKey: 'report', icon: PieChart },
  { id: 'loans', labelKey: 'loans', icon: HandCoins },
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { id: 'history', labelKey: 'history', icon: Clock },
  { id: 'settings', labelKey: 'settings', icon: Settings },
]

export function BottomNav() {
  const activeView = useAppStore((state) => state.activeView)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const { t } = useLanguage()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-50">
      <div className="flex items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 touch-target transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-xs font-medium">{t(item.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
