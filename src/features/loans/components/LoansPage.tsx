import { useState, useMemo } from 'react'
import { Plus, ArrowUpRight, ArrowDownLeft, ChevronDown, ChevronUp, ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { loanRepo, accountRepo, transactionRepo } from '@/database/repositories'
import { formatCurrency, getCurrencySymbol, getAmountColorClass } from '@/utils/currency'
import { LoanForm } from './LoanForm'
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
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [accountPaymentAmount, setAccountPaymentAmount] = useState('')
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [givenExpanded, setGivenExpanded] = useState(true)
  const [receivedExpanded, setReceivedExpanded] = useState(true)

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

  const handleOpenPayment = (loan: Loan) => {
    setPaymentLoan(loan)
    setPaymentAmount('')
    setAccountPaymentAmount('')
    // Pre-select the loan's associated account
    setSelectedPaymentAccountId(loan.accountId || null)
    setPaymentModalOpen(true)
  }

  const handlePayFull = () => {
    if (!paymentLoan) return
    setPaymentAmount((paymentLoan.amount - paymentLoan.paidAmount).toString())
  }

  // Check if payment involves different currencies
  const selectedPaymentAccount = selectedPaymentAccountId
    ? accounts.find(a => a.id === selectedPaymentAccountId)
    : null
  const isMultiCurrencyPayment = paymentLoan && selectedPaymentAccount &&
    paymentLoan.currency !== selectedPaymentAccount.currency

  const handleSubmitPayment = async () => {
    if (!paymentLoan || !paymentAmount) return
    const loanPaymentAmount = parseFloat(paymentAmount)
    if (isNaN(loanPaymentAmount) || loanPaymentAmount <= 0) return

    // For multi-currency, also need account amount
    if (isMultiCurrencyPayment && !accountPaymentAmount) return
    const accountAmount = isMultiCurrencyPayment
      ? parseFloat(accountPaymentAmount)
      : loanPaymentAmount

    if (isMultiCurrencyPayment && (isNaN(accountAmount) || accountAmount <= 0)) return

    setIsProcessing(true)
    try {
      await loanRepo.recordPayment(paymentLoan.id!, loanPaymentAmount)

      // If an account is selected, update its balance and create transaction
      if (selectedPaymentAccountId) {
        // Given loan: money coming back to you (+)
        // Received loan: money you're paying back (-)
        const balanceChange = paymentLoan.type === 'given' ? accountAmount : -accountAmount
        await accountRepo.updateBalance(selectedPaymentAccountId, balanceChange)

        await transactionRepo.create({
          type: 'loan_payment',
          amount: accountAmount,
          currency: selectedPaymentAccount?.currency || paymentLoan.currency,
          date: new Date(),
          loanId: paymentLoan.id,
          accountId: selectedPaymentAccountId,
          mainCurrencyAmount: paymentLoan.currency === mainCurrency ? loanPaymentAmount : undefined,
          comment: `${paymentLoan.type === 'given' ? t('paymentReceivedFrom') : t('paymentMadeTo')} ${paymentLoan.personName}`,
        })

        await refreshAccounts()
        await refreshTransactions()
      }

      await refreshLoans()
      setPaymentModalOpen(false)
      setPaymentLoan(null)
    } catch (error) {
      console.error('Failed to record payment:', error)
    } finally {
      setIsProcessing(false)
    }
  }

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

  const handleDeleteLoan = async (loan: Loan) => {
    if (!loan.id) return
    if (!confirm(t('deleteLoan'))) return

    try {
      // Find all transactions related to this loan
      const allTransactions = useAppStore.getState().transactions
      const loanTransactions = allTransactions.filter((tx) => tx.loanId === loan.id)

      // Reverse each transaction's account balance effect
      for (const tx of loanTransactions) {
        if (tx.accountId) {
          if (tx.type === 'loan_given') {
            // Original: balance decreased → reverse: add back
            await accountRepo.updateBalance(tx.accountId, tx.amount)
          } else if (tx.type === 'loan_received') {
            // Original: balance increased → reverse: subtract
            await accountRepo.updateBalance(tx.accountId, -tx.amount)
          } else if (tx.type === 'loan_payment') {
            if (loan.type === 'given') {
              // Payment on given loan: money came back → reverse: subtract
              await accountRepo.updateBalance(tx.accountId, -tx.amount)
            } else {
              // Payment on received loan: money went out → reverse: add back
              await accountRepo.updateBalance(tx.accountId, tx.amount)
            }
          }
        }
        // Delete the transaction
        await transactionRepo.delete(tx.id!)
      }

      // Delete the loan itself
      await loanRepo.delete(loan.id)

      await Promise.all([refreshLoans(), refreshAccounts(), refreshTransactions()])
    } catch (error) {
      console.error('Failed to delete loan:', error)
    }
  }

  const handleAddNew = () => {
    setEditingLoan(null)
    setLoanFormOpen(true)
  }

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan)
    setLoanFormOpen(true)
  }

  const remainingAmount = paymentLoan ? paymentLoan.amount - paymentLoan.paidAmount : 0

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
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onEdit={() => handleEdit(loan)}
                  onPayment={() => handleOpenPayment(loan)}
                  onDelete={() => handleDeleteLoan(loan)}
                />
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
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onEdit={() => handleEdit(loan)}
                  onPayment={() => handleOpenPayment(loan)}
                  onDelete={() => handleDeleteLoan(loan)}
                />
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
                <div className="flex items-center gap-2">
                  <p className="font-medium text-muted-foreground">
                    {formatCurrency(loan.amount, loan.currency)}
                  </p>
                  <button
                    onClick={() => handleDeleteLoan(loan)}
                    className="p-1 rounded-full hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loan Form */}
      <LoanForm
        loan={editingLoan}
        open={loanFormOpen}
        onClose={() => setLoanFormOpen(false)}
        onSave={handleSaveLoan}
      />

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={(open) => !open && setPaymentModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {paymentLoan?.type === 'given' ? t('recordRepayment') : t('makePayment')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-muted-foreground">
                {paymentLoan?.type === 'given'
                  ? `${paymentLoan?.personName} ${t('owes')}`
                  : `${t('youOweTo')} ${paymentLoan?.personName}`}
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(remainingAmount, paymentLoan?.currency || 'USD')}
              </p>
            </div>

            {/* Account Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('relatedAccount')}</label>
              <Select
                value={selectedPaymentAccountId?.toString() || 'none'}
                onValueChange={(v) => setSelectedPaymentAccountId(v === 'none' ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('none')}>
                    {selectedPaymentAccount
                      ? `${selectedPaymentAccount.name} (${selectedPaymentAccount.currency})`
                      : t('none')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('none')}</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id!.toString()}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Multi-currency payment amounts */}
            {isMultiCurrencyPayment ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {paymentLoan?.currency} ({t('amountOnLoan')})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`${getCurrencySymbol(paymentLoan?.currency || 'USD')}0.00`}
                    />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-5" />
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {selectedPaymentAccount?.currency} ({t('amountOnAccount')})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={accountPaymentAmount}
                      onChange={(e) => setAccountPaymentAmount(e.target.value)}
                      placeholder={`${getCurrencySymbol(selectedPaymentAccount?.currency || 'USD')}0.00`}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handlePayFull}
                >
                  {t('payFullAmount')} ({formatCurrency(remainingAmount, paymentLoan?.currency || 'USD')})
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('paymentAmount')}</label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={t('amount')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handlePayFull}
                >
                  {t('payFullAmount')} ({formatCurrency(remainingAmount, paymentLoan?.currency || 'USD')})
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={isProcessing || !paymentAmount || (!!isMultiCurrencyPayment && !accountPaymentAmount)}
            >
              {isProcessing ? t('processing') : t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper component for loan cards
function LoanCard({
  loan,
  onEdit,
  onPayment,
  onDelete,
}: {
  loan: Loan
  onEdit: () => void
  onPayment: () => void
  onDelete: () => void
}) {
  const { t } = useLanguage()
  const remaining = loan.amount - loan.paidAmount
  const progress = (loan.paidAmount / loan.amount) * 100

  return (
    <div className="p-4 bg-secondary/50 rounded-xl space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{loan.personName}</p>
          {loan.description && (
            <p className="text-sm text-muted-foreground">{loan.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-xs text-primary hover:underline"
          >
            {t('edit')}
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-full hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {t('paid')}: {formatCurrency(loan.paidAmount, loan.currency)}
          </span>
          <span className="font-medium">
            {formatCurrency(remaining, loan.currency)} {t('left')}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${loan.type === 'given' ? 'bg-success' : 'bg-destructive'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Payment button */}
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={onPayment}
      >
        {loan.type === 'given' ? t('recordRepayment') : t('makePayment')}
      </Button>
    </div>
  )
}
