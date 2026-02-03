import { useState, useRef, useEffect } from 'react'
import { X, Calendar, MessageSquare, ArrowRight, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { transactionRepo, accountRepo } from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { getCurrencySymbol, formatCurrency } from '@/utils/currency'
import { reverseTransactionBalance } from '@/utils/transactionBalance'
import type { Category, IncomeSource, Account, Transaction } from '@/database/types'

export type TransactionMode =
  | { type: 'income'; source: IncomeSource }
  | { type: 'expense'; category: Category }
  | { type: 'transfer'; fromAccount: Account; toAccount: Account }

interface QuickTransactionModalProps {
  mode: TransactionMode
  accounts: Account[]
  preselectedAccountId?: number
  editTransaction?: Transaction
  disableAutoFocus?: boolean
  onDelete?: (transaction: Transaction) => void
  onClose: () => void
}

export function QuickTransactionModal({
  mode,
  accounts,
  preselectedAccountId,
  editTransaction,
  disableAutoFocus,
  onDelete,
  onClose,
}: QuickTransactionModalProps) {
  const refreshTransactions = useAppStore((state) => state.refreshTransactions)
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const loans = useAppStore((state) => state.loans)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t, language } = useLanguage()

  const isEditMode = !!editTransaction

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
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = document.body.style.cssText
    document.body.style.cssText = `
      overflow: hidden;
      position: fixed;
      width: 100%;
      height: 100%;
    `
    return () => {
      document.body.style.cssText = originalStyle
    }
  }, [])

  // Prevent touchmove to stop iOS drag behavior
  useEffect(() => {
    const preventTouch = (e: TouchEvent) => {
      e.preventDefault()
    }

    document.addEventListener('touchmove', preventTouch, { passive: false })
    return () => document.removeEventListener('touchmove', preventTouch)
  }, [])

  // Track keyboard visibility using visualViewport API
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let debounceTimer: ReturnType<typeof setTimeout>

    const resetScroll = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    const handleViewportChange = () => {
      const heightDiff = window.innerHeight - viewport.height
      const newHeight = heightDiff > 50 ? heightDiff : 0

      // Debounce to prevent flicker during keyboard switch
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        setKeyboardHeight(newHeight)
      }, 50)

      resetScroll()
    }

    viewport.addEventListener('resize', handleViewportChange)
    viewport.addEventListener('scroll', handleViewportChange)
    window.addEventListener('scroll', resetScroll)

    return () => {
      clearTimeout(debounceTimer)
      viewport.removeEventListener('resize', handleViewportChange)
      viewport.removeEventListener('scroll', handleViewportChange)
      window.removeEventListener('scroll', resetScroll)
    }
  }, [])

  // Pre-populate form when editing
  useEffect(() => {
    if (editTransaction) {
      setAmount(editTransaction.amount.toString())
      setDate(new Date(editTransaction.date).toISOString().split('T')[0])
      setComment(editTransaction.comment || '')
      if (editTransaction.mainCurrencyAmount != null) {
        setTargetAmount(editTransaction.mainCurrencyAmount.toString())
      }
      if (editTransaction.toAmount != null) {
        setTargetAmount(editTransaction.toAmount.toString())
      }
    }
  }, [editTransaction])

  useEffect(() => {
    if (disableAutoFocus) return
    // Try focusing at multiple intervals to catch after animation
    const timers = [50, 150, 300, 500].map(ms =>
      setTimeout(() => amountInputRef.current?.focus(), ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [disableAutoFocus])

  // Detect multi-currency transfer
  const isMultiCurrencyTransfer = mode.type === 'transfer' &&
    mode.fromAccount.currency !== mode.toAccount.currency

  // Detect multi-currency for income/expense
  const selectedAccount = accounts.find(a => a.id === selectedAccountId)
  // For income: need SEPARATE mainCurrency field only if source != mainCurrency AND account != mainCurrency
  // If account IS mainCurrency, the accountAmount serves as mainCurrencyAmount (no separate field needed)
  const isMultiCurrencyIncome = mode.type === 'income' &&
    mode.source.currency !== mainCurrency &&
    selectedAccount?.currency !== mainCurrency
  // For expense: need mainCurrency conversion when account currency differs from mainCurrency (for budgets)
  const isMultiCurrencyExpense = mode.type === 'expense' &&
    selectedAccount?.currency !== mainCurrency
  const isMultiCurrencyIncomeExpense = isMultiCurrencyIncome || isMultiCurrencyExpense
  // For income: need account currency conversion if account differs from source
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
      // If editing, first reverse the old transaction's balance effects
      if (isEditMode && editTransaction) {
        await reverseTransactionBalance(editTransaction, loans)
      }

      if (mode.type === 'transfer') {
        // Handle transfer between accounts - single transaction record
        const fromAccount = mode.fromAccount
        const toAccount = mode.toAccount
        const numTargetAmount = isMultiCurrencyTransfer ? parseFloat(targetAmount) : numAmount

        const transactionData = {
          type: 'transfer' as const,
          amount: numAmount,
          currency: fromAccount.currency,
          accountId: fromAccount.id,
          toAccountId: toAccount.id,
          toAmount: isMultiCurrencyTransfer ? numTargetAmount : undefined,
          date: new Date(date),
          comment: comment || undefined,
        }

        if (isEditMode && editTransaction?.id) {
          await transactionRepo.update(editTransaction.id, transactionData)
        } else {
          await transactionRepo.create(transactionData)
        }

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
          const balanceAmount = needsAccountConversion
            ? parseFloat(accountAmount)  // account currency if different from source
            : numAmount  // same as source if currencies match

          // Determine mainCurrencyAmount:
          // - If source == mainCurrency: no conversion needed (undefined)
          // - If account == mainCurrency: balanceAmount IS the mainCurrency amount
          // - Otherwise: use the separate targetAmount field
          const sourceIsMain = mode.source.currency === mainCurrency
          const accountIsMain = account.currency === mainCurrency
          let storedMainCurrencyAmount: number | undefined
          if (sourceIsMain) {
            storedMainCurrencyAmount = undefined  // source is already main currency
          } else if (accountIsMain) {
            storedMainCurrencyAmount = balanceAmount  // account amount = main currency amount
          } else if (isMultiCurrencyIncome) {
            storedMainCurrencyAmount = parseFloat(targetAmount)  // separate field
          }

          const transactionData = {
            type: 'income' as const,
            amount: sourceAmount,  // source currency amount for display
            currency: mode.source.currency,  // income source currency
            date: new Date(date),
            comment: comment || undefined,
            accountId: selectedAccountId,
            incomeSourceId: mode.source.id,
            mainCurrencyAmount: storedMainCurrencyAmount,
          }

          if (isEditMode && editTransaction?.id) {
            await transactionRepo.update(editTransaction.id, transactionData)
          } else {
            await transactionRepo.create(transactionData)
          }

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

          const transactionData = {
            type: 'expense' as const,
            amount: transactionAmount,
            currency: account.currency,
            date: new Date(date),
            comment: comment || undefined,
            accountId: selectedAccountId,
            categoryId: mode.category.id,
            mainCurrencyAmount: storedMainCurrencyAmount,
          }

          if (isEditMode && editTransaction?.id) {
            await transactionRepo.update(editTransaction.id, transactionData)
          } else {
            await transactionRepo.create(transactionData)
          }

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
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-background overflow-hidden overscroll-none">
      {/* Full-page transaction form */}
      <div className="w-full max-w-lg mx-auto bg-card animate-in fade-in duration-200">
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
                {isEditMode
                  ? (mode.type === 'income' ? t('editIncome') : mode.type === 'expense' ? t('editExpense') : t('editTransfer'))
                  : (mode.type === 'income' ? t('addIncome') : mode.type === 'expense' ? t('addExpense') : t('transfer'))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isEditMode && onDelete && editTransaction && (
              <button
                onClick={() => onDelete(editTransaction)}
                className="p-2 rounded-full hover:bg-destructive/20 touch-target"
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary touch-target"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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
                    autoFocus={!disableAutoFocus}
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
                    autoFocus={!disableAutoFocus}
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
              autoFocus={!disableAutoFocus}
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

        {/* Date & Account info row */}
        <div className="px-2 pb-3 flex items-center gap-1.5">
          <label className="w-2/5 flex items-center gap-2 px-3 py-2.5 bg-secondary/50 rounded-lg cursor-pointer relative">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{
              date === new Date().toISOString().split('T')[0]
                ? t('today')
                : new Date(date + 'T00:00:00').toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })
            }</span>
            <input
              type="date"
              lang={language}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
          {mode.type !== 'transfer' && selectedAccount && (
            <div className="w-3/5 px-3 py-2.5 bg-secondary/50 rounded-lg flex items-center gap-1.5 min-w-0">
              <span className="font-medium truncate">{selectedAccount.name}</span>
              <span className="text-muted-foreground whitespace-nowrap text-sm">{formatCurrency(selectedAccount.balance, selectedAccount.currency)}</span>
            </div>
          )}
        </div>

        {/* Comment */}
        <div className="px-2 pb-4">
          <div className="flex items-start gap-3 px-3 py-3 bg-secondary/50 rounded-lg">
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

        {/* Submit Button - inline when no keyboard */}
        {keyboardHeight === 0 && (
          <div className="px-2 pb-4">
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
              {isSubmitting ? t('saving') : isEditMode ? t('update') : t('save')}
            </button>
          </div>
        )}
      </div>

      {/* Submit Button - fixed above keyboard when open */}
      {keyboardHeight > 0 && (
        <div
          className="fixed left-0 right-0 px-2 pb-2 bg-background transition-[bottom] duration-100"
          style={{ bottom: keyboardHeight }}
        >
          <div className="max-w-lg mx-auto">
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
              {isSubmitting ? t('saving') : isEditMode ? t('update') : t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
