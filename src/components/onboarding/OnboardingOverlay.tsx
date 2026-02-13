import { CheckCircle2, ArrowRight, X } from 'lucide-react'

import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'

export function OnboardingOverlay() {
  const onboardingStep = useAppStore((state) => state.onboardingStep)
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep)
  const skipOnboarding = useAppStore((state) => state.skipOnboarding)
  const completeOnboarding = useAppStore((state) => state.completeOnboarding)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const { t } = useLanguage()

  if (onboardingStep === 0) return null

  // Step 1: Welcome
  if (onboardingStep === 1) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70">
        <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💰</span>
          </div>
          <h2 className="text-xl font-bold mb-2">{t('onboardingWelcomeTitle')}</h2>
          <p className="text-muted-foreground mb-6">{t('onboardingWelcomeText')}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setOnboardingStep(2)}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
            >
              {t('onboardingGetStarted')}
            </button>
            <button onClick={skipOnboarding} className="w-full py-2 text-muted-foreground">
              {t('onboardingSkip')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Income tutorial
  if (onboardingStep === 2) {
    return (
      <div className="fixed inset-0 z-[200] pointer-events-none">
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Tooltip at top */}
        <div className="absolute top-20 left-4 right-4 pointer-events-auto">
          <div className="bg-card rounded-xl p-4 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t('onboardingIncomeTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('onboardingIncomeText')}</p>
              </div>
              <button onClick={skipOnboarding} className="p-1">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 text-primary">
              <span className="text-sm font-medium">{t('onboardingSalary')}</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-sm font-medium">{t('onboardingBankAccount')}</span>
            </div>
            <button
              onClick={() => setOnboardingStep(3)}
              className="w-full mt-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              {t('onboardingNext')}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={2} totalSteps={5} onSkip={skipOnboarding} />
      </div>
    )
  }

  // Step 3: Expense tutorial
  if (onboardingStep === 3) {
    return (
      <div className="fixed inset-0 z-[200] pointer-events-none">
        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute top-20 left-4 right-4 pointer-events-auto">
          <div className="bg-card rounded-xl p-4 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t('onboardingExpenseTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('onboardingExpenseText')}</p>
              </div>
              <button onClick={skipOnboarding} className="p-1">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 text-primary">
              <span className="text-sm font-medium">{t('onboardingBankAccount')}</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-sm font-medium">{t('onboardingGroceries')}</span>
            </div>
            <button
              onClick={() => {
                setActiveView('settings')
                setOnboardingStep(4)
              }}
              className="w-full mt-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              {t('onboardingNext')}
            </button>
          </div>
        </div>

        <StepIndicator currentStep={3} totalSteps={5} onSkip={skipOnboarding} />
      </div>
    )
  }

  // Step 4: Settings
  if (onboardingStep === 4) {
    return (
      <div className="fixed inset-0 z-[200] pointer-events-none">
        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute top-20 left-4 right-4 pointer-events-auto">
          <div className="bg-card rounded-xl p-4 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t('onboardingCurrencyTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('onboardingCurrencyText')}</p>
              </div>
              <button onClick={skipOnboarding} className="p-1">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <button
              onClick={() => setOnboardingStep(5)}
              className="w-full mt-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              {t('onboardingNext')}
            </button>
          </div>
        </div>

        <StepIndicator currentStep={4} totalSteps={5} onSkip={skipOnboarding} />
      </div>
    )
  }

  // Step 5: Completion
  if (onboardingStep === 5) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70">
        <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h2 className="text-xl font-bold mb-2">{t('onboardingCompletionTitle')}</h2>
          <p className="text-muted-foreground mb-6">{t('onboardingCompletionText')}</p>
          <button
            onClick={() => {
              completeOnboarding()
              setActiveView('dashboard')
            }}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            {t('onboardingStartApp')}
          </button>
        </div>
      </div>
    )
  }

  return null
}

function StepIndicator({
  currentStep,
  totalSteps,
  onSkip,
}: {
  currentStep: number
  totalSteps: number
  onSkip: () => void
}) {
  const { t } = useLanguage()

  return (
    <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-3 pointer-events-auto">
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              i + 1 === currentStep
                ? 'bg-primary'
                : i + 1 < currentStep
                  ? 'bg-primary/50'
                  : 'bg-white/30'
            )}
          />
        ))}
      </div>
      <button onClick={onSkip} className="text-sm text-white/70">
        {t('onboardingSkip')}
      </button>
    </div>
  )
}
