import { useState, useMemo } from 'react'
import { Plus, ArrowUpRight, ArrowDownLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { loanRepo, accountRepo, transactionRepo } from '@/database/repositories'
import { formatCurrency, getAmountColorClass } from '@/utils/currency'
import { LoanForm } from './LoanForm'
import { PaymentDialog } from './PaymentDialog'
import type { LoanFormData } from './LoanForm'
import type { Loan } from '@/database/types'

export function LoansPage() {
  const loans = useAppStore((state) => state.loans)
  const accounts = useAppStore((state) => state.accounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const refreshLoans = useAppStore((state) => state.refreshLoans)
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const refreshTransactions = useAppStore((state) => state.refreshTransactions)
  const { t } = useLanguage()

  const [loanFormOpen, setLoanFormOpen] = useState(false)
  const [givenExpanded, setGivenExpanded] = useState(true)
  const [receivedExpanded, setReceivedExpanded] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  // Split loans by type and status
  const { activeGiven, activeReceived, paidGiven, paidReceived } = useMemo(() => {
    const activeGiven: Loan[] = []
    const activeReceived: Loan[] = []
    const paidGiven: Loan[] = []
    const paidReceived: Loan[] = []

    loans.forEach((loan) => {
      if (loan.type === 'given') {
        if (loan.status === 'fully_paid') {
          paidGiven.push(loan)
        } else {
          activeGiven.push(loan)
        }
      } else {
        if (loan.status === 'fully_paid') {
          paidReceived.push(loan)
        } else {
          activeReceived.push(loan)
        }
      }
    })

    return { activeGiven, activeReceived, paidGiven, paidReceived }
  }, [loans])

  // Calculate totals grouped by currency
  const totals = useMemo(() => {
    const givenByCurrency: Record<string, number> = {}
    activeGiven.forEach((l) => {
      givenByCurrency[l.currency] = (givenByCurrency[l.currency] || 0) + (l.amount - l.paidAmount)
    })

    const receivedByCurrency: Record<string, number> = {}
    activeReceived.forEach((l) => {
      receivedByCurrency[l.currency] = (receivedByCurrency[l.currency] || 0) + (l.amount - l.paidAmount)
    })

    return { givenByCurrency, receivedByCurrency }
  }, [activeGiven, activeReceived])

  const handleSaveLoan = async (data: LoanFormData, isEdit: boolean, loanId?: number) => {
    if (isEdit && loanId) {
      // Edit: just update loan fields, no transaction/balance changes
      await loanRepo.update(loanId, {
        type: data.type,
        personName: data.personName,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        accountId: data.accountId,
        dueDate: data.dueDate,
      })
    } else {
      // Create: save loan, create transaction, update account balance
      const newLoanId = await loanRepo.create({
        type: data.type,
        personName: data.personName,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        paidAmount: 0,
        status: 'active',
        accountId: data.accountId,
        dueDate: data.dueDate,
      })

      const account = accounts.find(a => a.id === data.accountId)
      // Amount to use for account balance update
      const balanceAmount = data.accountAmount ?? data.amount

      // loan_given: you give money out → balance decreases
      // loan_received: you receive money → balance increases
      const balanceChange = data.type === 'given' ? -balanceAmount : balanceAmount
      await accountRepo.updateBalance(data.accountId, balanceChange)

      // Create transaction record
      const transactionType = data.type === 'given' ? 'loan_given' as const : 'loan_received' as const
      await transactionRepo.create({
        type: transactionType,
        amount: balanceAmount,
        currency: account?.currency || data.currency,
        date: new Date(),
        loanId: newLoanId as number,
        accountId: data.accountId,
        mainCurrencyAmount: data.currency === mainCurrency ? data.amount : undefined,
        comment: `${data.type === 'given' ? t('loanTo') : t('loanFrom')} ${data.personName}`,
      })

      await refreshAccounts()
      await refreshTransactions()
    }

    await refreshLoans()
  }

  const handleAddNew = () => {
    setLoanFormOpen(true)
  }

  const handleLoanClick = (loan: Loan) => {
    setSelectedLoan(loan)
    setPaymentDialogOpen(true)
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold">{t('loansAndDebts')}</h1>
        <Button size="sm" onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-1" />
          {t('add')}
        </Button>
      </div>

      {/* Summary */}
      <div className="px-4 py-2 grid grid-cols-2 gap-3">
        <div className="p-4 bg-secondary/50 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">{t('owedToYou')}</span>
          </div>
          <div className="space-y-1">
            {Object.keys(totals.givenByCurrency).length === 0 ? (
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(0, mainCurrency)}
              </p>
            ) : (
              Object.entries(totals.givenByCurrency).map(([currency, amount]) => (
                <p key={currency} className={`text-xl font-bold ${getAmountColorClass(amount)}`}>
                  {formatCurrency(amount, currency)}
                </p>
              ))
            )}
          </div>
        </div>
        <div className="p-4 bg-secondary/50 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground">{t('youOwe')}</span>
          </div>
          <div className="space-y-1">
            {Object.keys(totals.receivedByCurrency).length === 0 ? (
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(0, mainCurrency)}
              </p>
            ) : (
              Object.entries(totals.receivedByCurrency).map(([currency, amount]) => (
                <p key={currency} className={`text-xl font-bold ${amount === 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {formatCurrency(amount, currency)}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Money Given Section */}
      <section className="px-4 py-2">
        <button
          onClick={() => setGivenExpanded(!givenExpanded)}
          className="flex items-center justify-between w-full py-2 touch-target"
        >
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-success" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('moneyGiven')}
            </h3>
            <span className="text-xs text-muted-foreground">({activeGiven.length})</span>
            {givenExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {givenExpanded && (
          <div className="space-y-2 mt-2">
            {activeGiven.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                {t('noActiveLoansGiven')}
              </p>
            ) : (
              activeGiven.map((loan) => (
                <LoanCard key={loan.id} loan={loan} onClick={() => handleLoanClick(loan)} />
              ))
            )}
          </div>
        )}
      </section>

      {/* Money Received Section */}
      <section className="px-4 py-2">
        <button
          onClick={() => setReceivedExpanded(!receivedExpanded)}
          className="flex items-center justify-between w-full py-2 touch-target"
        >
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('moneyReceived')}
            </h3>
            <span className="text-xs text-muted-foreground">({activeReceived.length})</span>
            {receivedExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {receivedExpanded && (
          <div className="space-y-2 mt-2">
            {activeReceived.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                {t('noActiveDebts')}
              </p>
            ) : (
              activeReceived.map((loan) => (
                <LoanCard key={loan.id} loan={loan} onClick={() => handleLoanClick(loan)} />
              ))
            )}
          </div>
        )}
      </section>

      {/* Paid Off Section */}
      {(paidGiven.length > 0 || paidReceived.length > 0) && (
        <section className="px-4 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t('completed')}
          </h3>
          <div className="space-y-2">
            {[...paidGiven, ...paidReceived].map((loan) => (
              <div
                key={loan.id}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl opacity-60"
              >
                <div>
                  <p className="font-medium">{loan.personName}</p>
                  <p className="text-xs text-muted-foreground">
                    {loan.type === 'given' ? t('repaid') : t('paidOff')}
                  </p>
                </div>
                <p className="font-medium text-muted-foreground">
                  {formatCurrency(loan.amount, loan.currency)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loan Form */}
      <LoanForm
        loan={null}
        open={loanFormOpen}
        onClose={() => setLoanFormOpen(false)}
        onSave={handleSaveLoan}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        loan={selectedLoan}
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false)
          setSelectedLoan(null)
        }}
      />
    </div>
  )
}

// Helper component for loan cards
function LoanCard({ loan, onClick }: { loan: Loan; onClick?: () => void }) {
  const { t } = useLanguage()
  const remaining = loan.amount - loan.paidAmount
  const progress = (loan.paidAmount / loan.amount) * 100

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-secondary/50 rounded-xl active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{loan.personName}</p>
          {loan.description && (
            <p className="text-sm text-muted-foreground truncate">{loan.description}</p>
          )}
        </div>
        <div className="text-right ml-3">
          <p className="font-semibold whitespace-nowrap">
            {formatCurrency(remaining, loan.currency)}
          </p>
          <p className="text-xs text-muted-foreground">{t('left')}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${loan.type === 'given' ? 'bg-success' : 'bg-destructive'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        <span>{formatCurrency(loan.paidAmount, loan.currency)} {t('paid').toLowerCase()}</span>
        <span>{formatCurrency(loan.amount, loan.currency)}</span>
      </div>
    </button>
  )
}
