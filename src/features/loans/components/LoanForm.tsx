import { ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { AccountSelect } from '@/components/ui/AccountSelect'
import { CurrencySelect } from '@/components/ui/CurrencySelect'
import { FormDialogFooter } from '@/components/ui/FormDialogFooter'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { loanRepo } from '@/database/repositories'
import type { Loan, LoanType, Transaction } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useAppStore } from '@/store/useAppStore'
import { formatDateForInput } from '@/utils/date'

export interface LoanFormData {
  type: LoanType
  personName: string
  description?: string
  amount: number
  currency: string
  accountId: number
  accountAmount?: number // set when account currency ≠ loan currency
  // Set when neither the loan currency nor the account currency is the main
  // currency, so there's no other way to derive the main-currency equivalent
  mainCurrencyAmount?: number
  dueDate?: Date
}

interface LoanFormProps {
  loan?: Loan
  // The loan's originating loan_given/loan_received transaction, used to
  // pre-fill the account/main-currency amounts when editing
  editTransaction?: Transaction
  open: boolean
  onClose: () => void
  onSave?: (data: LoanFormData, isEdit: boolean, loanId?: number) => Promise<void>
}

export function LoanForm({ loan, editTransaction, open, onClose, onSave }: LoanFormProps) {
  const accounts = useAppStore((state) => state.accounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const refreshLoans = useAppStore((state) => state.refreshLoans)
  const { t, language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)

  const [type, setType] = useState<LoanType>('given')
  const [personName, setPersonName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(mainCurrency)
  const [accountId, setAccountId] = useState('')
  const [accountAmount, setAccountAmount] = useState('')
  const [mainCurrencyAmount, setMainCurrencyAmount] = useState('')
  const [dueDate, setDueDate] = useState('')

  const selectedAccount = accountId
    ? accounts.find((a) => a.id === Number.parseInt(accountId))
    : undefined
  const isMultiCurrency = selectedAccount && currency !== selectedAccount.currency
  // Neither the loan currency nor the account currency is the main currency,
  // so there's no way to derive the main-currency equivalent automatically.
  const loanIsMain = currency === mainCurrency
  const accountIsMain = selectedAccount?.currency === mainCurrency
  const needsMainCurrencyAmount = !!selectedAccount && !loanIsMain && !accountIsMain

  useResetOnChange([loan, editTransaction, open, mainCurrency, accounts], () => {
    if (loan) {
      setType(loan.type)
      setPersonName(loan.personName)
      setDescription(loan.description || '')
      setAmount(loan.amount.toString())
      setCurrency(loan.currency)
      setAccountId(loan.accountId?.toString() || '')
      setDueDate(loan.dueDate ? formatDateForInput(new Date(loan.dueDate)) : '')
      // The transaction's `amount` is always in the account's own currency
      // for loan_given/loan_received (there's no separate accountAmount field).
      setAccountAmount(
        editTransaction && editTransaction.currency !== loan.currency
          ? editTransaction.amount.toString()
          : ''
      )
      setMainCurrencyAmount(editTransaction?.mainCurrencyAmount?.toString() || '')
    } else {
      setType('given')
      setPersonName('')
      setDescription('')
      setAmount('')
      setCurrency(mainCurrency)
      setAccountId(accounts.length > 0 ? accounts[0].id!.toString() : '')
      setDueDate('')
      setAccountAmount('')
      setMainCurrencyAmount('')
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personName.trim() || !amount || !accountId) return
    if (isMultiCurrency && !accountAmount) return
    if (needsMainCurrencyAmount && !mainCurrencyAmount) return

    const parsedAmount = Number.parseFloat(amount)
    const parsedAccountAmount = isMultiCurrency ? Number.parseFloat(accountAmount) : undefined
    const parsedMainCurrencyAmount = needsMainCurrencyAmount
      ? Number.parseFloat(mainCurrencyAmount)
      : undefined

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return
    if (isMultiCurrency && (Number.isNaN(parsedAccountAmount!) || parsedAccountAmount! <= 0)) return
    if (
      needsMainCurrencyAmount &&
      (Number.isNaN(parsedMainCurrencyAmount!) || parsedMainCurrencyAmount! <= 0)
    )
      return

    setIsLoading(true)
    try {
      const formData: LoanFormData = {
        type,
        personName: personName.trim(),
        description: description.trim() || undefined,
        amount: parsedAmount,
        currency,
        accountId: Number.parseInt(accountId),
        accountAmount: parsedAccountAmount,
        mainCurrencyAmount: parsedMainCurrencyAmount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      }

      if (onSave) {
        await onSave(formData, !!loan?.id, loan?.id)
      } else {
        // Fallback: save directly if no onSave handler is provided
        await (loan?.id
          ? loanRepo.update(loan.id, {
              type: formData.type,
              personName: formData.personName,
              description: formData.description,
              amount: formData.amount,
              currency: formData.currency,
              accountId: formData.accountId,
              dueDate: formData.dueDate,
            })
          : loanRepo.create({
              type: formData.type,
              personName: formData.personName,
              description: formData.description,
              amount: formData.amount,
              currency: formData.currency,
              paidAmount: 0,
              status: 'active',
              accountId: formData.accountId,
              dueDate: formData.dueDate,
            }))
        await refreshLoans()
      }
      onClose()
    } catch (error) {
      console.error('Failed to save loan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{loan ? t('editLoan') : t('addLoan')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">{t('type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as LoanType)}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectType')}>
                  {type === 'given' ? t('moneyILent') : t('moneyIBorrowed')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="given">{t('moneyILent')}</SelectItem>
                <SelectItem value="received">{t('moneyIBorrowed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personName">
              {type === 'given' ? t('whoDidYouLendTo') : t('whoDidYouBorrowFrom')}
            </Label>
            <Input
              id="personName"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder={t('personOrCompanyName')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">{t('relatedAccount')}</Label>
            <AccountSelect
              id="account"
              accounts={accounts}
              value={accountId}
              onValueChange={setAccountId}
              placeholder={t('selectAccount')}
            />
          </div>

          {/* Amount inputs — dual when multi-currency */}
          {isMultiCurrency ? (
            <div className="space-y-2">
              <Label>{t('amount')}</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {currency} ({t('amountOnLoan')})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-5" />
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {selectedAccount?.currency} ({t('amountOnAccount')})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={accountAmount}
                    onChange={(e) => setAccountAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('amount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{t('currency')}</Label>
                <CurrencySelect
                  id="currency"
                  value={currency}
                  onValueChange={setCurrency}
                  placeholder={t('currency')}
                />
              </div>
            </div>
          )}

          {/* Currency selector when multi-currency — show separately so user can still change loan currency */}
          {isMultiCurrency && (
            <div className="space-y-2">
              <Label htmlFor="currency">{t('currency')}</Label>
              <CurrencySelect
                id="currency"
                value={currency}
                onValueChange={setCurrency}
                placeholder={t('currency')}
              />
            </div>
          )}

          {needsMainCurrencyAmount && (
            <div className="space-y-2">
              <Label htmlFor="mainCurrencyAmount">
                {mainCurrency} ({t('amountInMainCurrency')})
              </Label>
              <Input
                id="mainCurrencyAmount"
                type="number"
                step="0.01"
                value={mainCurrencyAmount}
                onChange={(e) => setMainCurrencyAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dueDate">{t('dueDate')}</Label>
            <Input
              id="dueDate"
              type="date"
              lang={language}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('addNotesAboutLoan')}
              rows={2}
            />
          </div>

          <FormDialogFooter
            isEditing={!!loan}
            isLoading={isLoading}
            onCancel={onClose}
            submitDisabled={
              !accountId ||
              (isMultiCurrency && !accountAmount) ||
              (needsMainCurrencyAmount && !mainCurrencyAmount)
            }
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}
