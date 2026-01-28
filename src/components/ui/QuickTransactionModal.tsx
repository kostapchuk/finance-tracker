import { useState, useRef, useEffect } from 'react'
import { X, Calendar, MessageSquare, ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { transactionRepo, accountRepo } from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { getCurrencySymbol, formatCurrency } from '@/utils/currency'
import type { Category, IncomeSource, Account } from '@/database/types'

type TransactionMode =
  | { type: 'income'; source: IncomeSource }
  | { type: 'expense'; category: Category }
  | { type: 'transfer'; fromAccount: Account; toAccount: Account }

interface QuickTransactionModalProps {
  mode: TransactionMode
  accounts: Account[]
  preselectedAccountId?: number
  onClose: () => void
}

export function QuickTransactionModal({
  mode,
  accounts,
  preselectedAccountId,
  onClose,
}: QuickTransactionModalProps) {
  const refreshTransactions = useAppStore((state) => state.refreshTransactions)
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t } = useLanguage()

  const [amount, setAmount] = useState('')
  const [targetAmount, setTargetAmount] = useState('')  // mainCurrency amount for totals
  const [accountAmount, setAccountAmount] = useState('')  // account currency amount (for income when account != source)
  const [activeAmountField, setActiveAmountField] = useState<'source' | 'target' | 'account'>('source')
  const [selectedAccountId] = useState<number | undefined>(
    preselectedAccountId ?? accounts[0]?.id
  )
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const amountInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Try focusing at multiple intervals to catch after animation
    const timers = [50, 150, 300, 500].map(ms =>
      setTimeout(() => amountInputRef.current?.focus(), ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  // Detect multi-currency transfer
  const isMultiCurrencyTransfer = mode.type === 'transfer' &&
    mode.fromAccount.currency !== mode.toAccount.currency

  // Detect multi-currency for income/expense
  const selectedAccount = accounts.find(a => a.id === selectedAccountId)
  // For income: need mainCurrency conversion when source currency differs from mainCurrency (for totals)
  // For expense: need mainCurrency conversion when account currency differs from mainCurrency (for budgets)
  const isMultiCurrencyIncome = mode.type === 'income' &&
    mode.source.currency !== mainCurrency
  const isMultiCurrencyExpense = mode.type === 'expense' &&
    selectedAccount?.currency !== mainCurrency
  const isMultiCurrencyIncomeExpense = isMultiCurrencyIncome || isMultiCurrencyExpense
  // For income: also need account currency conversion if account differs from source
  const needsAccountConversion = mode.type === 'income' &&
    selectedAccount?.currency !== mode.source.currency

  // Determine title and color based on mode type
  const getTitle = () => {
    if (mode.type === 'income') return mode.source.name
    if (mode.type === 'expense') return mode.category.name
    return `${mode.fromAccount.name} → ${mode.toAccount.name}`
  }
  const getColor = () => {
    if (mode.type === 'income') return mode.source.color
    if (mode.type === 'expense') return mode.category.color
    return '#6366f1' // Indigo for transfers
  }
  const title = getTitle()
  const color = getColor()

  // Get current currency symbol for display
  const getCurrentCurrency = () => {
    if (mode.type === 'income') return accounts.find(a => a.id === selectedAccountId)?.currency || 'USD'
    if (mode.type === 'expense') return accounts.find(a => a.id === selectedAccountId)?.currency || 'USD'
    return activeAmountField === 'source' ? mode.fromAccount.currency : mode.toAccount.currency
  }

  const sanitizeAmount = (value: string) => {
    // Allow only digits and dot, treat comma as dot
    let v = value.replace(/,/g, '.').replace(/[^0-9.]/g, '')
    // Only one dot allowed
    const parts = v.split('.')
    if (parts.length > 2) {
      v = parts[0] + '.' + parts.slice(1).join('')
    }
    // Strip leading zeros (except "0." or just "0")
    v = v.replace(/^0+(?=\d)/, '')
    // Limit to 10 digits before dot and 2 after
    const dotIndex = v.indexOf('.')
    if (dotIndex !== -1) {
      v = v.slice(0, Math.min(dotIndex, 10)) + v.slice(dotIndex, dotIndex + 3)
    } else {
      v = v.slice(0, 10)
    }
    return v
  }

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0 || isSubmitting) return

    // For multi-currency transfer, also need target amount
    if (isMultiCurrencyTransfer) {
      const numTargetAmount = parseFloat(targetAmount)
      if (isNaN(numTargetAmount) || numTargetAmount <= 0) return
    }

    // For multi-currency income/expense, also need mainCurrency amount
    if (isMultiCurrencyIncomeExpense) {
      const numTargetAmount = parseFloat(targetAmount)
      if (isNaN(numTargetAmount) || numTargetAmount <= 0) return
    }

    // For income with different account currency, also need account amount
    if (needsAccountConversion) {
      const numAccountAmount = parseFloat(accountAmount)
      if (isNaN(numAccountAmount) || numAccountAmount <= 0) return
    }

    // For income/expense, we need a selected account
    if (mode.type !== 'transfer' && !selectedAccountId) return

    setIsSubmitting(true)

    try {
      if (mode.type === 'transfer') {
        // Handle transfer between accounts - single transaction record
        const fromAccount = mode.fromAccount
        const toAccount = mode.toAccount
        const numTargetAmount = isMultiCurrencyTransfer ? parseFloat(targetAmount) : numAmount

        // Create single transfer transaction
        await transactionRepo.create({
          type: 'transfer',
          amount: numAmount,
          currency: fromAccount.currency,
          accountId: fromAccount.id,
          toAccountId: toAccount.id,
          toAmount: isMultiCurrencyTransfer ? numTargetAmount : undefined,
          date: new Date(date),
          comment: comment || undefined,
        })

        // Update balances
        await accountRepo.updateBalance(fromAccount.id!, -numAmount)
        await accountRepo.updateBalance(toAccount.id!, numTargetAmount)
      } else {
        // Handle income/expense
        const account = accounts.find((a) => a.id === selectedAccountId)
        if (!account) return

        if (mode.type === 'income') {
          // Income handling:
          // - amount = source currency (what you earned, for tile display)
          // - mainCurrencyAmount = main currency (for totals)
          // - account balance = accountAmount if account != source, else use amount
          const sourceAmount = numAmount  // source currency
          const mainAmount = isMultiCurrencyIncome ? parseFloat(targetAmount) : numAmount  // mainCurrency
          const balanceAmount = needsAccountConversion
            ? parseFloat(accountAmount)  // account currency if different from source
            : numAmount  // same as source if currencies match

          await transactionRepo.create({
            type: 'income',
            amount: sourceAmount,  // source currency amount for display
            currency: mode.source.currency,  // income source currency
            date: new Date(date),
            comment: comment || undefined,
            accountId: selectedAccountId,
            incomeSourceId: mode.source.id,
            mainCurrencyAmount: isMultiCurrencyIncome ? mainAmount : undefined,
          })

          // Update account balance
          await accountRepo.updateBalance(selectedAccountId!, balanceAmount)
        } else {
          // Expense handling:
          // - amount = account currency
          // - mainCurrencyAmount = main currency (for budgets)
          const transactionAmount = numAmount
          const storedMainCurrencyAmount = isMultiCurrencyExpense
            ? parseFloat(targetAmount)
            : undefined

          await transactionRepo.create({
            type: 'expense',
            amount: transactionAmount,
            currency: account.currency,
            date: new Date(date),
            comment: comment || undefined,
            accountId: selectedAccountId,
            categoryId: mode.category.id,
            mainCurrencyAmount: storedMainCurrencyAmount,
          })

          // Update account balance
          await accountRepo.updateBalance(selectedAccountId!, -transactionAmount)
        }
      }

      // Refresh data
      await Promise.all([refreshTransactions(), refreshAccounts()])

      onClose()
    } catch (error) {
      console.error('Failed to save transaction:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl pb-20 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {mode.type === 'transfer' ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: (mode.fromAccount.color || '#6366f1') + '20' }}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: mode.fromAccount.color || '#6366f1' }}
                  />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: (mode.toAccount.color || '#6366f1') + '20' }}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: mode.toAccount.color || '#6366f1' }}
                  />
                </div>
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: color + '20' }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            )}
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">
                {mode.type === 'income' ? t('addIncome') : mode.type === 'expense' ? t('addExpense') : t('transfer')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary touch-target"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Amount Display */}
        {isMultiCurrencyTransfer ? (
          // Multi-currency transfer: show both amounts
          <div className="p-4">
            <div className="flex items-center justify-center gap-3">
              {/* Source Amount */}
              <div
                className={cn(
                  'flex-1 p-4 rounded-xl transition-all',
                  activeAmountField === 'source'
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : 'bg-secondary/50'
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">{mode.fromAccount.currency}</p>
                <div className="flex items-baseline gap-1">
                  <input
                    ref={amountInputRef}
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                    onFocus={() => setActiveAmountField('source')}
                    placeholder="0"
                    className="w-full bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                  />
                  <span className="text-2xl font-bold tabular-nums text-muted-foreground">{getCurrencySymbol(mode.fromAccount.currency)}</span>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

              {/* Target Amount */}
              <div
                className={cn(
                  'flex-1 p-4 rounded-xl transition-all',
                  activeAmountField === 'target'
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : 'bg-secondary/50'
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">{mode.toAccount.currency}</p>
                <div className="flex items-baseline gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(sanitizeAmount(e.target.value))}
                    onFocus={() => setActiveAmountField('target')}
                    placeholder="0"
                    className="w-full bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                  />
                  <span className="text-2xl font-bold tabular-nums text-muted-foreground">{getCurrencySymbol(mode.toAccount.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (isMultiCurrencyIncomeExpense || needsAccountConversion) && selectedAccount ? (
          // Multi-currency income/expense
          <div className="p-4">
            <div className="flex items-center justify-center gap-2">
              {/* Source Amount - for income: source currency, for expense: account currency */}
              <div
                className={cn(
                  'flex-1 p-3 rounded-xl transition-all',
                  activeAmountField === 'source'
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : 'bg-secondary/50'
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {mode.type === 'income' ? mode.source.currency : selectedAccount.currency}
                </p>
                <div className="flex items-baseline gap-1">
                  <input
                    ref={amountInputRef}
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                    onFocus={() => setActiveAmountField('source')}
                    placeholder="0"
                    className="w-full bg-transparent text-xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                  />
                  <span className="text-xl font-bold tabular-nums text-muted-foreground">{getCurrencySymbol(mode.type === 'income' ? mode.source.currency : selectedAccount.currency)}</span>
                </div>
              </div>

              {/* MainCurrency Amount (for totals) - shown when source != mainCurrency */}
              {isMultiCurrencyIncomeExpense && (
                <>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div
                    className={cn(
                      'flex-1 p-3 rounded-xl transition-all',
                      activeAmountField === 'target'
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-secondary/50'
                    )}
                  >
                    <p className="text-xs text-muted-foreground mb-1">{mainCurrency}</p>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                    step="0.01"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(sanitizeAmount(e.target.value))}
                        onFocus={() => setActiveAmountField('target')}
                        placeholder="0"
                        className="w-full bg-transparent text-xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                      />
                      <span className="text-xl font-bold tabular-nums text-muted-foreground">{getCurrencySymbol(mainCurrency)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Account Amount (for balance) - shown for income when account != source */}
              {needsAccountConversion && (
                <>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div
                    className={cn(
                      'flex-1 p-3 rounded-xl transition-all',
                      activeAmountField === 'account'
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-secondary/50'
                    )}
                  >
                    <p className="text-xs text-muted-foreground mb-1">{selectedAccount.currency}</p>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                    step="0.01"
                        value={accountAmount}
                        onChange={(e) => setAccountAmount(sanitizeAmount(e.target.value))}
                        onFocus={() => setActiveAmountField('account')}
                        placeholder="0"
                        className="w-full bg-transparent text-xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                      />
                      <span className="text-xl font-bold tabular-nums text-muted-foreground">{getCurrencySymbol(selectedAccount.currency)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          // Single currency: show one amount
          <div className="p-6 flex items-baseline justify-center gap-2">
            <input
              ref={amountInputRef}
              autoFocus
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
              placeholder="0"
              className="w-full bg-transparent text-5xl font-bold tabular-nums text-foreground outline-none text-right placeholder:text-muted-foreground"
            />
            <span className="text-5xl font-bold tabular-nums text-muted-foreground">{getCurrencySymbol(getCurrentCurrency())}</span>
          </div>
        )}

        {/* Account info (only for income/expense, not transfers) */}
        {mode.type !== 'transfer' && selectedAccount && (
          <div className="px-4 pb-4">
            <div className="px-4 py-2.5 bg-secondary/50 rounded-xl inline-flex items-center gap-2">
              <span className="font-medium">{selectedAccount.name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{formatCurrency(selectedAccount.balance, selectedAccount.currency)}</span>
            </div>
          </div>
        )}

        {/* Comment - prominent secondary action */}
        <div className="px-4 pb-3">
          <div className="flex items-start gap-3 px-4 py-3 bg-secondary rounded-xl">
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <textarea
              placeholder={t('addComment')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground resize-none"
            />
          </div>
        </div>

        {/* Date */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 px-4 py-2.5 sm:py-2 bg-secondary/50 rounded-lg w-fit">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-base sm:text-sm outline-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleSubmit}
            disabled={
              !amount ||
              (isMultiCurrencyTransfer && !targetAmount) ||
              (isMultiCurrencyIncomeExpense && !targetAmount) ||
              (needsAccountConversion && !accountAmount) ||
              (mode.type !== 'transfer' && !selectedAccountId) ||
              isSubmitting
            }
            className={cn(
              'w-full py-4 rounded-xl text-lg font-semibold transition-colors touch-target',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 active:bg-primary/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
