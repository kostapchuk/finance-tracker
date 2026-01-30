import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { loanRepo, transactionRepo, accountRepo } from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import type { Loan, Transaction } from '@/database/types'
import { formatCurrency, getCurrencySymbol } from '@/utils/currency'

interface PaymentDialogProps {
  loan: Loan | null
  open: boolean
  onClose: () => void
  editTransaction?: Transaction
}

export function PaymentDialog({ loan, open, onClose, editTransaction }: PaymentDialogProps) {
  const accounts = useAppStore((state) => state.accounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t } = useLanguage()
  const refreshLoans = useAppStore((state) => state.refreshLoans)
  const refreshTransactions = useAppStore((state) => state.refreshTransactions)
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const [amount, setAmount] = useState('')
  const [accountAmount, setAccountAmount] = useState('')
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isEditMode = !!editTransaction
  const account = loan?.accountId ? accounts.find(a => a.id === loan.accountId) : null
  const isMultiCurrency = loan && account && loan.currency !== account.currency

  const sanitizeAmount = (value: string) => {
    let v = value.replace(/,/g, '.').replace(/[^0-9.]/g, '')
    const parts = v.split('.')
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
    v = v.replace(/^0+(?=\d)/, '')
    const dotIndex = v.indexOf('.')
    if (dotIndex !== -1) v = v.slice(0, Math.min(dotIndex, 10)) + v.slice(dotIndex, dotIndex + 3)
    else v = v.slice(0, 10)
    return v
  }

  useEffect(() => {
    if (open) {
      if (editTransaction) {
        // Pre-populate from existing transaction
        setAmount(editTransaction.mainCurrencyAmount?.toString() || editTransaction.amount.toString())
        setAccountAmount(editTransaction.amount.toString())
        setComment(editTransaction.comment || '')
      } else {
        setAmount('')
        setAccountAmount('')
        setComment('')
      }
    }
  }, [open, editTransaction])

  // Calculate the "effective remaining" that includes the old payment when editing
  const getEffectiveRemaining = () => {
    if (!loan) return 0
    const baseRemaining = loan.amount - loan.paidAmount
    if (isEditMode && editTransaction) {
      // Add back the old payment amount to get the "available" amount
      const oldPaymentAmount = editTransaction.mainCurrencyAmount ?? editTransaction.amount
      return baseRemaining + oldPaymentAmount
    }
    return baseRemaining
  }

  const effectiveRemaining = getEffectiveRemaining()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loan?.id || !amount) return

    const paymentAmount = parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > effectiveRemaining) return

    // For multi-currency, also need account amount
    if (isMultiCurrency && !accountAmount) return
    const acctAmount = isMultiCurrency ? parseFloat(accountAmount) : paymentAmount
    if (isMultiCurrency && (isNaN(acctAmount) || acctAmount <= 0)) return

    setIsLoading(true)
    try {
      if (isEditMode && editTransaction?.id) {
        // EDIT MODE: Reverse old payment, apply new payment
        const oldPaymentAmount = editTransaction.mainCurrencyAmount ?? editTransaction.amount
        const oldAccountAmount = editTransaction.amount

        // Reverse the old payment from loan
        await loanRepo.reversePayment(loan.id, oldPaymentAmount)

        // Reverse old account balance change
        if (loan.accountId) {
          if (loan.type === 'given') {
            await accountRepo.updateBalance(loan.accountId, -oldAccountAmount)
          } else {
            await accountRepo.updateBalance(loan.accountId, oldAccountAmount)
          }
        }

        // Apply new payment to loan
        await loanRepo.recordPayment(loan.id, paymentAmount)

        // Update the transaction record
        await transactionRepo.update(editTransaction.id, {
          amount: acctAmount,
          currency: account?.currency || loan.currency,
          mainCurrencyAmount: loan.currency === mainCurrency ? paymentAmount : undefined,
          comment: comment || `${loan.type === 'given' ? t('paymentReceivedFrom') : t('paymentMadeTo')} ${loan.personName}`,
        })

        // Apply new account balance change
        if (loan.accountId) {
          if (loan.type === 'given') {
            await accountRepo.updateBalance(loan.accountId, acctAmount)
          } else {
            await accountRepo.updateBalance(loan.accountId, -acctAmount)
          }
        }
      } else {
        // CREATE MODE: Normal payment creation
        await loanRepo.recordPayment(loan.id, paymentAmount)

        // Create a transaction record
        await transactionRepo.create({
          type: 'loan_payment',
          amount: acctAmount,
          currency: account?.currency || loan.currency,
          date: new Date(),
          loanId: loan.id,
          accountId: loan.accountId,
          mainCurrencyAmount: loan.currency === mainCurrency ? paymentAmount : undefined,
          comment: comment || `${loan.type === 'given' ? t('paymentReceivedFrom') : t('paymentMadeTo')} ${loan.personName}`,
        })

        // Update account balance if linked
        if (loan.accountId) {
          if (loan.type === 'given') {
            // Money coming back to us
            await accountRepo.updateBalance(loan.accountId, acctAmount)
          } else {
            // Money going out from us
            await accountRepo.updateBalance(loan.accountId, -acctAmount)
          }
        }
      }

      await refreshLoans()
      await refreshTransactions()
      await refreshAccounts()
      handleClose()
    } catch (error) {
      console.error('Failed to record payment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setAmount('')
    setAccountAmount('')
    setComment('')
    onClose()
  }

  if (!loan) return null

  const displayRemaining = loan.amount - loan.paidAmount

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('editPayment') : t('recordPayment')}</DialogTitle>
          <DialogDescription>
            {loan.type === 'given'
              ? `${isEditMode ? t('editingPaymentFrom') : t('recordingPaymentFrom')} ${loan.personName}`
              : `${isEditMode ? t('editingPaymentTo') : t('recordingPaymentTo')} ${loan.personName}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('totalAmount')}</span>
              <span className="font-medium">{formatCurrency(loan.amount, loan.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('alreadyPaid')}</span>
              <span className="font-medium">{formatCurrency(loan.paidAmount, loan.currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>{t('remaining')}</span>
              <span className="text-primary">{formatCurrency(displayRemaining, loan.currency)}</span>
            </div>
          </div>

          {isMultiCurrency ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {loan.currency} ({t('amountOnLoan')})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(loan.currency)}
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                      className="pl-8"
                      placeholder="0.00"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-5" />
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {account?.currency} ({t('amountOnAccount')})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(account?.currency || 'USD')}
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={accountAmount}
                      onChange={(e) => setAccountAmount(sanitizeAmount(e.target.value))}
                      className="pl-8"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>
              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(effectiveRemaining.toString())}
                >
                  {t('payFullRemaining')} ({formatCurrency(effectiveRemaining, loan.currency)})
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="amount">{t('paymentAmount')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(loan.currency)}
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                  className="pl-8"
                  placeholder="0.00"
                  autoFocus
                  required
                />
              </div>
              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(effectiveRemaining.toString())}
                >
                  {t('payFullRemaining')}
                </Button>
              )}
            </div>
          )}

          {/* Comment field for edit mode */}
          {isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="comment">{t('comment')}</Label>
              <Input
                id="comment"
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('addComment')}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !amount || (!!isMultiCurrency && !accountAmount) || parseFloat(amount) > effectiveRemaining}
            >
              {isLoading ? t('recording') : isEditMode ? t('update') : t('recordPayment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
