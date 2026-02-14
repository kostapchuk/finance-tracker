import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea'
import { loanRepo } from '@/database/repositories'
import type { Loan, LoanType } from '@/database/types'
import { useAccounts, useSettings } from '@/hooks/useDataHooks'
import { useLanguage } from '@/hooks/useLanguage'
import { getAllCurrencies } from '@/utils/currency'
import { formatDateForInput } from '@/utils/date'

export interface LoanFormData {
  type: LoanType
  personName: string
  description?: string
  amount: number
  currency: string
  accountId: number
  accountAmount?: number // set when account currency ≠ loan currency
  dueDate?: Date
}

interface LoanFormProps {
  loan?: Loan | null
  open: boolean
  onClose: () => void
  onSave?: (data: LoanFormData, isEdit: boolean, loanId?: number) => Promise<void>
}

export function LoanForm({ loan, open, onClose, onSave }: LoanFormProps) {
  const { data: accounts = [] } = useAccounts()
  const { data: settings } = useSettings()
  const mainCurrency = settings?.defaultCurrency || 'BYN'
  const queryClient = useQueryClient()
  const { t, language } = useLanguage()

  const [type, setType] = useState<LoanType>('given')
  const [personName, setPersonName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(mainCurrency)
  const [accountId, setAccountId] = useState('')
  const [accountAmount, setAccountAmount] = useState('')
  const [dueDate, setDueDate] = useState('')

  const selectedAccount = accountId ? accounts.find((a) => a.id === parseInt(accountId)) : null
  const isMultiCurrency = selectedAccount && currency !== selectedAccount.currency

  useEffect(() => {
    if (loan) {
      setType(loan.type)
      setPersonName(loan.personName)
      setDescription(loan.description || '')
      setAmount(loan.amount.toString())
      setCurrency(loan.currency)
      setAccountId(loan.accountId?.toString() || '')
      setDueDate(loan.dueDate ? formatDateForInput(new Date(loan.dueDate)) : '')
    } else {
      setType('given')
      setPersonName('')
      setDescription('')
      setAmount('')
      setCurrency(mainCurrency)
      setAccountId(accounts.length > 0 ? accounts[0].id!.toString() : '')
      setDueDate('')
    }
    setAccountAmount('')
  }, [loan, open, mainCurrency, accounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personName.trim() || !amount || !accountId) return
    if (isMultiCurrency && !accountAmount) return

    const parsedAmount = parseFloat(amount)
    const parsedAccountAmount = isMultiCurrency ? parseFloat(accountAmount) : undefined

    if (isNaN(parsedAmount) || parsedAmount <= 0) return
    if (isMultiCurrency && (isNaN(parsedAccountAmount!) || parsedAccountAmount! <= 0)) return

    try {
      const formData: LoanFormData = {
        type,
        personName: personName.trim(),
        description: description.trim() || undefined,
        amount: parsedAmount,
        currency,
        accountId: parseInt(accountId),
        accountAmount: parsedAccountAmount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      }

      if (onSave) {
        await onSave(formData, !!loan?.id, loan?.id)
      } else {
        // Fallback: save directly (for backward compatibility with LoanList)
        if (loan?.id) {
          await loanRepo.update(loan.id, {
            type: formData.type,
            personName: formData.personName,
            description: formData.description,
            amount: formData.amount,
            currency: formData.currency,
            accountId: formData.accountId,
            dueDate: formData.dueDate,
          })
        } else {
          await loanRepo.create({
            type: formData.type,
            personName: formData.personName,
            description: formData.description,
            amount: formData.amount,
            currency: formData.currency,
            paidAmount: 0,
            status: 'active',
            accountId: formData.accountId,
            dueDate: formData.dueDate,
          })
        }
        queryClient.setQueryData(['loans'], await loanRepo.getAll())
      }
      onClose()
    } catch (error) {
      console.error('Failed to save loan:', error)
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
            <Select value={accountId} onValueChange={setAccountId}>
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
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('currency')}>
                      {getAllCurrencies().find((c) => c.code === currency)?.symbol} {currency}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {getAllCurrencies().map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Currency selector when multi-currency — show separately so user can still change loan currency */}
          {isMultiCurrency && (
            <div className="space-y-2">
              <Label htmlFor="currency">{t('currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder={t('currency')}>
                    {getAllCurrencies().find((c) => c.code === currency)?.symbol} {currency}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {getAllCurrencies().map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!accountId}>
              {loan ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
