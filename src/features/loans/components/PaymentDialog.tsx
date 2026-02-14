import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { loanRepo, transactionRepo, accountRepo } from '@/database/repositories'
import type { Loan, Transaction } from '@/database/types'
import { useAccounts, useSettings } from '@/hooks/useDataHooks'
import { useLanguage } from '@/hooks/useLanguage'
import { formatCurrency, getCurrencySymbol } from '@/utils/currency'
import { deleteLoanWithTransactions } from '@/utils/transactionBalance'

interface PaymentDialogProps {
  loan: Loan | null
  open: boolean
  onClose: () => void
  editTransaction?: Transaction
}

export function PaymentDialog({ loan, open, onClose, editTransaction }: PaymentDialogProps) {
  const { data: accounts = [] } = useAccounts()
  const { data: settings } = useSettings()
  const mainCurrency = settings?.defaultCurrency || 'BYN'
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const [amount, setAmount] = useState('')
  const [accountAmount, setAccountAmount] = useState('')
  const [comment, setComment] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const isEditMode = !!editTransaction
  const selectedAccount = selectedAccountId
    ? accounts.find((a) => a.id === parseInt(selectedAccountId))
    : null
  const isMultiCurrency = loan && selectedAccount && loan.currency !== selectedAccount.currency

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
        setAmount(
          editTransaction.mainCurrencyAmount?.toString() || editTransaction.amount.toString()
        )
        setAccountAmount(editTransaction.amount.toString())
        setComment(editTransaction.comment || '')
        setSelectedAccountId(
          editTransaction.accountId?.toString() || loan?.accountId?.toString() || ''
        )
      } else {
        setAmount('')
        setAccountAmount('')
        setComment('')
        setSelectedAccountId(loan?.accountId?.toString() || '')
      }
    }
  }, [open, editTransaction, loan])

  useEffect(() => {
    if (selectedAccount && !isMultiCurrency) {
      setAccountAmount('')
    }
  }, [selectedAccountId, selectedAccount, isMultiCurrency])

  const getEffectiveRemaining = () => {
    if (!loan) return 0
    const baseRemaining = loan.amount - loan.paidAmount
    if (isEditMode && editTransaction) {
      const oldPaymentAmount = editTransaction.mainCurrencyAmount ?? editTransaction.amount
      return baseRemaining + oldPaymentAmount
    }
    return baseRemaining
  }

  const effectiveRemaining = getEffectiveRemaining()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loan?.id || !amount || !selectedAccountId) return

    const paymentAmount = parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > effectiveRemaining) return

    if (isMultiCurrency && !accountAmount) return
    const acctAmount = isMultiCurrency ? parseFloat(accountAmount) : paymentAmount
    if (isMultiCurrency && (isNaN(acctAmount) || acctAmount <= 0)) return

    const acctId = parseInt(selectedAccountId)

    setIsLoading(true)
    try {
      if (isEditMode && editTransaction?.id) {
        const oldPaymentAmount = editTransaction.mainCurrencyAmount ?? editTransaction.amount
        const oldAccountAmount = editTransaction.amount
        const oldAccountId = editTransaction.accountId

        await loanRepo.reversePayment(loan.id, oldPaymentAmount)

        if (oldAccountId) {
          if (loan.type === 'given') {
            await accountRepo.updateBalance(oldAccountId, -oldAccountAmount)
          } else {
            await accountRepo.updateBalance(oldAccountId, oldAccountAmount)
          }
        }

        await loanRepo.recordPayment(loan.id, paymentAmount)

        await transactionRepo.update(editTransaction.id, {
          amount: acctAmount,
          currency: selectedAccount?.currency || loan.currency,
          accountId: acctId,
          mainCurrencyAmount: loan.currency === mainCurrency ? paymentAmount : undefined,
          comment:
            comment ||
            `${loan.type === 'given' ? t('paymentReceivedFrom') : t('paymentMadeTo')} ${loan.personName}`,
        })

        if (loan.type === 'given') {
          await accountRepo.updateBalance(acctId, acctAmount)
        } else {
          await accountRepo.updateBalance(acctId, -acctAmount)
        }
      } else {
        await loanRepo.recordPayment(loan.id, paymentAmount)

        await transactionRepo.create({
          type: 'loan_payment',
          amount: acctAmount,
          currency: selectedAccount?.currency || loan.currency,
          date: new Date(),
          loanId: loan.id,
          accountId: acctId,
          mainCurrencyAmount: loan.currency === mainCurrency ? paymentAmount : undefined,
          comment:
            comment ||
            `${loan.type === 'given' ? t('paymentReceivedFrom') : t('paymentMadeTo')} ${loan.personName}`,
        })

        if (loan.type === 'given') {
          await accountRepo.updateBalance(acctId, acctAmount)
        } else {
          await accountRepo.updateBalance(acctId, -acctAmount)
        }
      }

      queryClient.setQueryData(['loans'], await loanRepo.getAll())
      queryClient.setQueryData(['transactions'], await transactionRepo.getAll())
      queryClient.setQueryData(['accounts'], await accountRepo.getAll())
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
    setSelectedAccountId('')
    onClose()
  }

  const handleDelete = async () => {
    if (!loan?.id) return
    if (!confirm(t('deleteLoan'))) return

    setIsLoading(true)
    try {
      await deleteLoanWithTransactions(loan)
      queryClient.setQueryData(['loans'], await loanRepo.getAll())
      queryClient.setQueryData(['transactions'], await transactionRepo.getAll())
      queryClient.setQueryData(['accounts'], await accountRepo.getAll())
      handleClose()
    } catch (error) {
      console.error('Failed to delete loan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!loan) return null

  const displayRemaining = loan.amount - loan.paidAmount

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <div className="flex items-start justify-between">
          <DialogHeader>
            <DialogTitle>{loan.personName}</DialogTitle>
            <DialogDescription>
              {loan.type === 'given' ? t('moneyGiven') : t('moneyReceived')}
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-destructive/20 touch-target flex-shrink-0"
            aria-label={t('delete')}
          >
            <Trash2 className="h-5 w-5 text-destructive" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold">
                {formatCurrency(displayRemaining, loan.currency)}
              </span>
              <span className="text-sm text-muted-foreground">{t('remaining')}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${loan.type === 'given' ? 'bg-success' : 'bg-destructive'}`}
                style={{ width: `${(loan.paidAmount / loan.amount) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {formatCurrency(loan.paidAmount, loan.currency)} {t('paid').toLowerCase()}
              </span>
              <span>
                {formatCurrency(loan.amount, loan.currency)} {t('total').toLowerCase()}
              </span>
            </div>
          </div>

          {isMultiCurrency ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">{loan.currency}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(loan.currency)}
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                      className="pl-8 text-lg"
                      placeholder="0.00"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-5" />
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {selectedAccount?.currency}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(selectedAccount?.currency || 'USD')}
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={accountAmount}
                      onChange={(e) => setAccountAmount(sanitizeAmount(e.target.value))}
                      className="pl-8 text-lg"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  {getCurrencySymbol(loan.currency)}
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                  className="pl-8 text-lg h-12"
                  placeholder="0.00"
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('paymentAccount')}</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectAccount')}>
                  {selectedAccount
                    ? `${selectedAccount.name} (${selectedAccount.currency})`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id!.toString()}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEditMode && displayRemaining > 0 && (
            <button
              type="button"
              onClick={() => setAmount(effectiveRemaining.toString())}
              className="w-full py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              {t('payFullRemaining')} ({formatCurrency(effectiveRemaining, loan.currency)})
            </button>
          )}

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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 sm:flex-none"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !amount ||
                !selectedAccountId ||
                (!!isMultiCurrency && !accountAmount) ||
                parseFloat(amount) > effectiveRemaining
              }
              className="flex-1 sm:flex-none"
            >
              {isLoading ? t('recording') : isEditMode ? t('update') : t('recordPayment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
