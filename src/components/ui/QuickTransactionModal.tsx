import { X, Calendar, MessageSquare, ArrowRight, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { transactionRepo, accountRepo, loanRepo } from '@/database/repositories'
import type { Category, IncomeSource, Account, Transaction, Loan, LoanType } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { getCurrencySymbol, formatCurrency, getAllCurrencies } from '@/utils/currency'
import { getStartOfMonth, getEndOfMonth, formatDateForInput } from '@/utils/date'
import {
  reverseTransactionBalance,
  applyTransactionBalance,
  deleteLoanWithTransactions,
} from '@/utils/transactionBalance'

export type TransactionMode =
  | { type: 'income'; source: IncomeSource; preselectedAccountId?: number }
  | { type: 'expense'; category: Category; preselectedAccountId?: number }
  | { type: 'transfer'; fromAccount: Account; toAccount: Account }
  | { type: 'loan'; loan?: Loan }
  | { type: 'loan_payment'; loan: Loan }

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
  const refreshLoans = useAppStore((state) => state.refreshLoans)
  const loans = useAppStore((state) => state.loans)
  const incomeSources = useAppStore((state) => state.incomeSources)
  const categories = useAppStore((state) => state.categories)
  const transactions = useAppStore((state) => state.transactions)
  const selectedMonth = useAppStore((state) => state.selectedMonth)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t, language } = useLanguage()

  const isEditMode = !!editTransaction

  const [amount, setAmount] = useState(
    mode.type === 'loan' && mode.loan ? mode.loan.amount.toString() : ''
  )
  const [targetAmount, setTargetAmount] = useState('') // mainCurrency amount for totals
  const [accountAmount, setAccountAmount] = useState('') // account currency amount (for income when account != source)
  const [activeField, setActiveField] = useState<
    'source' | 'target' | 'account' | 'comment' | 'date' | null
  >('source')
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(
    preselectedAccountId ?? accounts[0]?.id
  )
  const [selectedSourceId, setSelectedSourceId] = useState<number | undefined>(
    mode.type === 'income' ? mode.source.id : undefined
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(
    mode.type === 'expense' ? mode.category.id : undefined
  )
  const [loanType, setLoanType] = useState<LoanType>(
    mode.type === 'loan' ? (mode.loan?.type ?? 'given') : 'given'
  )
  const [personName, setPersonName] = useState(
    mode.type === 'loan' ? (mode.loan?.personName ?? '') : ''
  )
  const [loanCurrency, setLoanCurrency] = useState(
    mode.type === 'loan' ? (mode.loan?.currency ?? mainCurrency) : mainCurrency
  )
  const [dueDate, setDueDate] = useState(
    mode.type === 'loan' && mode.loan?.dueDate
      ? formatDateForInput(new Date(mode.loan.dueDate))
      : ''
  )
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [comment, setComment] = useState(
    mode.type === 'loan' && mode.loan ? (mode.loan.description ?? '') : ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [buttonCovered, setButtonCovered] = useState(false)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const currentSwipeY = useRef(0)

  // Auto-resize comment textarea based on content
  useEffect(() => {
    const textarea = commentRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 150)
    textarea.style.height = `${newHeight}px`
  }, [comment])
  useEffect(() => {
    const originalStyle = document.body.style.cssText
    document.body.style.cssText = `
      overflow: hidden;
      position: fixed;
      width: 100%;
      height: 100%;
    `

    const preventTouch = (e: TouchEvent) => {
      e.preventDefault()
    }
    document.addEventListener('touchmove', preventTouch, { passive: false })

    return () => {
      document.body.style.cssText = originalStyle
      document.removeEventListener('touchmove', preventTouch)
    }
  }, [])

  // Swipe down to close - using refs for smooth animation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    )
      return
    touchStartY.current = e.touches[0].clientY
    if (modalRef.current) {
      modalRef.current.style.transition = 'none'
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY.current) return
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (deltaY > 0 && modalRef.current) {
      currentSwipeY.current = deltaY
      // Apply resistance for more natural feel
      const resistedY = deltaY * 0.6
      modalRef.current.style.transform = `translateY(${resistedY}px)`
      modalRef.current.style.opacity = `${1 - resistedY / 400}`
    }
  }

  const handleTouchEnd = () => {
    if (!modalRef.current) return
    modalRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out'

    if (currentSwipeY.current > 80) {
      // Swipe far enough - close with animation
      modalRef.current.style.transform = 'translateY(100%)'
      modalRef.current.style.opacity = '0'
      setTimeout(onClose, 300)
    } else {
      // Snap back
      modalRef.current.style.transform = 'translateY(0)'
      modalRef.current.style.opacity = '1'
    }
    touchStartY.current = 0
    currentSwipeY.current = 0
    touchStartY.current = 0
  }

  // Prevent page scroll on input focus using transform hack
  const handleInputTouchStart = (e: React.TouchEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = e.currentTarget
    if (document.activeElement === el) return // Already focused

    e.preventDefault()
    el.style.transform = 'translateY(-8000px)'
    el.focus()
    setTimeout(() => {
      el.style.transform = 'none'
      window.scrollTo(0, 0)
      // Refocus to show cursor
      el.blur()
      el.focus()
    }, 0)
  }

  // Track keyboard height and check if button is covered
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const updateKeyboardHeight = () => {
      const heightDiff = window.innerHeight - viewport.height
      const kbHeight = heightDiff > 50 ? heightDiff : 0
      setKeyboardHeight(kbHeight)

      // Check if button would be covered by keyboard
      if (buttonContainerRef.current && kbHeight > 0) {
        const buttonRect = buttonContainerRef.current.getBoundingClientRect()
        const viewportBottom = viewport.height
        setButtonCovered(buttonRect.bottom > viewportBottom)
      } else {
        setButtonCovered(false)
      }
    }

    viewport.addEventListener('resize', updateKeyboardHeight)
    return () => viewport.removeEventListener('resize', updateKeyboardHeight)
  }, [])

  // Pre-populate form when editing
  useResetOnChange([editTransaction], () => {
    if (!editTransaction) return

    if (mode.type === 'loan_payment') {
      setAmount(editTransaction.mainCurrencyAmount?.toString() || editTransaction.amount.toString())
      setAccountAmount(editTransaction.amount.toString())
      setComment(editTransaction.comment || '')
    } else if (mode.type !== 'loan') {
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
  })

  useEffect(() => {
    if (disableAutoFocus) return
    // Try focusing at multiple intervals to catch after animation
    const timers = [50, 150, 300, 500].map((ms) =>
      setTimeout(() => amountInputRef.current?.focus(), ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [disableAutoFocus])

  // Get the currently selected income source
  const selectedSource =
    mode.type === 'income'
      ? incomeSources.find((s) => s.id === selectedSourceId) || mode.source
      : null

  // Get the currently selected category (filter out loan categories)
  const expenseCategories = categories.filter((c) => c.categoryType !== 'loan')
  const selectedCategory =
    mode.type === 'expense'
      ? expenseCategories.find((c) => c.id === selectedCategoryId) || mode.category
      : null

  // Calculate monthly total for selected category
  const categoryMonthlyTotal = useMemo(() => {
    if (mode.type !== 'expense' || !selectedCategoryId) return 0
    const startOfMonth = getStartOfMonth(selectedMonth)
    const endOfMonth = getEndOfMonth(selectedMonth)
    return transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.categoryId === selectedCategoryId &&
          new Date(t.date) >= startOfMonth &&
          new Date(t.date) <= endOfMonth
      )
      .reduce((sum, t) => sum + (t.mainCurrencyAmount ?? t.amount), 0)
  }, [mode.type, selectedCategoryId, transactions, selectedMonth])

  // Calculate monthly total for selected income source
  const sourceMonthlyTotal = useMemo(() => {
    if (mode.type !== 'income' || !selectedSourceId) return 0
    const startOfMonth = getStartOfMonth(selectedMonth)
    const endOfMonth = getEndOfMonth(selectedMonth)
    return transactions
      .filter(
        (t) =>
          t.type === 'income' &&
          t.incomeSourceId === selectedSourceId &&
          new Date(t.date) >= startOfMonth &&
          new Date(t.date) <= endOfMonth
      )
      .reduce((sum, t) => sum + t.amount, 0)
  }, [mode.type, selectedSourceId, transactions, selectedMonth])

  // Detect multi-currency transfer
  const isMultiCurrencyTransfer =
    mode.type === 'transfer' && mode.fromAccount.currency !== mode.toAccount.currency

  // Detect multi-currency for income/expense
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)
  // For income: need SEPARATE mainCurrency field only if source != mainCurrency AND account != mainCurrency
  // If account IS mainCurrency, the accountAmount serves as mainCurrencyAmount (no separate field needed)
  const sourceCurrency =
    selectedSource?.currency || (mode.type === 'income' ? mode.source.currency : '')
  const isMultiCurrencyIncome =
    mode.type === 'income' &&
    sourceCurrency !== mainCurrency &&
    selectedAccount?.currency !== mainCurrency
  // For expense: need mainCurrency conversion when account currency differs from mainCurrency (for budgets)
  const isMultiCurrencyExpense =
    mode.type === 'expense' && selectedAccount?.currency !== mainCurrency
  const isMultiCurrencyIncomeExpense = isMultiCurrencyIncome || isMultiCurrencyExpense
  // For income: need account currency conversion if account differs from source
  const needsAccountConversion =
    mode.type === 'income' && selectedAccount?.currency !== sourceCurrency

  // Detect multi-currency for loan creation/editing and loan payments
  const currentLoanCurrency =
    mode.type === 'loan' ? loanCurrency : mode.type === 'loan_payment' ? mode.loan.currency : ''
  const isMultiCurrencyLoan =
    (mode.type === 'loan' || mode.type === 'loan_payment') &&
    !!selectedAccount &&
    currentLoanCurrency !== selectedAccount.currency

  // Remaining balance on the loan being paid (accounting for the payment being edited, if any)
  const paymentRemaining =
    mode.type === 'loan_payment' ? mode.loan.amount - mode.loan.paidAmount : 0
  const effectivePaymentRemaining =
    mode.type === 'loan_payment' && isEditMode && editTransaction
      ? paymentRemaining + (editTransaction.mainCurrencyAmount ?? editTransaction.amount)
      : paymentRemaining

  // Reset amounts when account or source changes
  const handleAccountChange = (newAccountId: number) => {
    const newAccount = accounts.find((a) => a.id === newAccountId)
    const oldAccount = selectedAccount
    if (newAccount && oldAccount && newAccount.currency !== oldAccount.currency) {
      // Currency changed, reset conversion amounts
      setTargetAmount('')
      setAccountAmount('')
    }
    setSelectedAccountId(newAccountId)
    setShowAccountPicker(false)
  }

  const handleSourceChange = (newSourceId: number) => {
    const newSource = incomeSources.find((s) => s.id === newSourceId)
    const oldSource = selectedSource
    if (newSource && oldSource && newSource.currency !== oldSource.currency) {
      // Currency changed, reset amounts
      setAmount('')
      setTargetAmount('')
      setAccountAmount('')
    }
    setSelectedSourceId(newSourceId)
    setShowSourcePicker(false)
  }

  const handleCategoryChange = (newCategoryId: number) => {
    setSelectedCategoryId(newCategoryId)
    setShowCategoryPicker(false)
  }

  // Determine color based on mode type
  const getColor = () => {
    if (mode.type === 'income') return selectedSource?.color || mode.source.color
    if (mode.type === 'expense') return selectedCategory?.color || mode.category.color
    return '#6366f1' // Indigo for transfers
  }
  const color = getColor()
  const currentSourceCurrency =
    selectedSource?.currency || (mode.type === 'income' ? mode.source.currency : '')

  // Get current currency symbol for display
  const getCurrentCurrency = () => {
    if (mode.type === 'income' || mode.type === 'expense')
      return accounts.find((a) => a.id === selectedAccountId)?.currency || 'USD'
    if (mode.type === 'loan' || mode.type === 'loan_payment') return currentLoanCurrency
    return activeField === 'source' ? mode.fromAccount.currency : mode.toAccount.currency
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

    // For a loan/loan payment with different account currency, also need account amount
    if (isMultiCurrencyLoan) {
      const numAccountAmount = parseFloat(accountAmount)
      if (isNaN(numAccountAmount) || numAccountAmount <= 0) return
    }

    // Loans need a person name; payments can't exceed what's left on the loan
    if (mode.type === 'loan' && !personName.trim()) return
    if (mode.type === 'loan_payment' && numAmount > effectivePaymentRemaining) return

    // For income/expense/loan/payment, we need a selected account
    if (mode.type !== 'transfer' && !selectedAccountId) return

    setIsSubmitting(true)

    try {
      // If editing, first reverse the old transaction's balance effects
      if (isEditMode && editTransaction) {
        await reverseTransactionBalance(editTransaction, loans)
      }

      switch (mode.type) {
        case 'transfer': {
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
          break
        }

        case 'loan': {
          // Handle loan creation/editing (loan_given / loan_received)
          const account = accounts.find((a) => a.id === selectedAccountId)
          if (!account) return

          const accountCurrencyAmount = isMultiCurrencyLoan ? parseFloat(accountAmount) : numAmount
          const transactionType =
            loanType === 'given' ? ('loan_given' as const) : ('loan_received' as const)
          const transactionMainCurrencyAmount =
            loanCurrency === mainCurrency ? numAmount : undefined

          const loanFields = {
            type: loanType,
            personName: personName.trim(),
            description: comment.trim() || undefined,
            amount: numAmount,
            currency: loanCurrency,
            accountId: selectedAccountId!,
            dueDate: dueDate ? new Date(dueDate) : undefined,
          }

          if (isEditMode && editTransaction?.id && mode.loan?.id) {
            await loanRepo.update(mode.loan.id, loanFields)

            const transactionUpdates = {
              type: transactionType,
              amount: accountCurrencyAmount,
              currency: account.currency,
              accountId: selectedAccountId!,
              mainCurrencyAmount: transactionMainCurrencyAmount,
            }
            await transactionRepo.update(editTransaction.id, transactionUpdates)
            await applyTransactionBalance({ ...editTransaction, ...transactionUpdates }, loans)
          } else {
            const newLoanId = await loanRepo.create({
              ...loanFields,
              paidAmount: 0,
              status: 'active',
            })

            const newTransaction = {
              type: transactionType,
              amount: accountCurrencyAmount,
              currency: account.currency,
              date: new Date(),
              loanId: newLoanId as number,
              accountId: selectedAccountId!,
              mainCurrencyAmount: transactionMainCurrencyAmount,
              comment: `${loanType === 'given' ? t('loanTo') : t('loanFrom')} ${personName.trim()}`,
            }
            await transactionRepo.create(newTransaction)
            await applyTransactionBalance(newTransaction, loans)
          }

          await refreshLoans()
          break
        }

        case 'loan_payment': {
          // Handle recording/editing a loan payment
          const account = accounts.find((a) => a.id === selectedAccountId)
          if (!account) return

          const loan = mode.loan
          const accountCurrencyAmount = isMultiCurrencyLoan ? parseFloat(accountAmount) : numAmount
          const paymentComment =
            comment.trim() ||
            `${loan.type === 'given' ? t('paymentReceivedFrom') : t('paymentMadeTo')} ${loan.personName}`
          const transactionMainCurrencyAmount =
            loan.currency === mainCurrency ? numAmount : undefined

          if (isEditMode && editTransaction?.id) {
            const transactionUpdates = {
              amount: accountCurrencyAmount,
              currency: account.currency,
              accountId: selectedAccountId!,
              mainCurrencyAmount: transactionMainCurrencyAmount,
              comment: paymentComment,
            }
            await transactionRepo.update(editTransaction.id, transactionUpdates)
            await applyTransactionBalance({ ...editTransaction, ...transactionUpdates }, loans)
          } else {
            const newTransaction = {
              type: 'loan_payment' as const,
              amount: accountCurrencyAmount,
              currency: account.currency,
              date: new Date(),
              loanId: loan.id,
              accountId: selectedAccountId!,
              mainCurrencyAmount: transactionMainCurrencyAmount,
              comment: paymentComment,
            }
            await transactionRepo.create(newTransaction)
            await applyTransactionBalance(newTransaction, loans)
          }

          await refreshLoans()
          break
        }

        case 'income':
        case 'expense': {
          // Handle income/expense
          const account = accounts.find((a) => a.id === selectedAccountId)
          if (!account) return

          if (mode.type === 'income') {
            // Income handling:
            // - amount = source currency (what you earned, for tile display)
            // - mainCurrencyAmount = main currency (for totals)
            // - account balance = accountAmount if account != source, else use amount
            const incomeSource = selectedSource || mode.source
            const sourceAmount = numAmount // source currency
            const balanceAmount = needsAccountConversion
              ? parseFloat(accountAmount) // account currency if different from source
              : numAmount // same as source if currencies match

            // Determine mainCurrencyAmount:
            // - If source == mainCurrency: no conversion needed (undefined)
            // - If account == mainCurrency: balanceAmount IS the mainCurrency amount
            // - Otherwise: use the separate targetAmount field
            const sourceIsMain = incomeSource.currency === mainCurrency
            const accountIsMain = account.currency === mainCurrency
            let storedMainCurrencyAmount: number | undefined
            if (sourceIsMain) {
              storedMainCurrencyAmount = undefined // source is already main currency
            } else if (accountIsMain) {
              storedMainCurrencyAmount = balanceAmount // account amount = main currency amount
            } else if (isMultiCurrencyIncome) {
              storedMainCurrencyAmount = parseFloat(targetAmount) // separate field
            }

            const transactionData = {
              type: 'income' as const,
              amount: sourceAmount, // source currency amount for display
              currency: incomeSource.currency, // income source currency
              date: new Date(date),
              comment: comment || undefined,
              accountId: selectedAccountId,
              incomeSourceId: incomeSource.id,
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
            const expenseCategory = selectedCategory || mode.category
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
              categoryId: expenseCategory.id,
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
          break
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

  // Deleting from a loan payment removes the whole loan and its transactions,
  // matching the original PaymentDialog's behavior.
  const handleDeleteLoan = async () => {
    if (mode.type !== 'loan_payment') return
    if (!mode.loan.id) return
    if (!confirm(t('deleteLoan'))) return

    setIsSubmitting(true)
    try {
      await deleteLoanWithTransactions(mode.loan)
      await Promise.all([refreshLoans(), refreshTransactions(), refreshAccounts()])
      onClose()
    } catch (error) {
      console.error('Failed to delete loan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitDisabled =
    !amount ||
    isSubmitting ||
    (isMultiCurrencyTransfer && !targetAmount) ||
    (isMultiCurrencyIncomeExpense && !targetAmount) ||
    (needsAccountConversion && !accountAmount) ||
    (isMultiCurrencyLoan && !accountAmount) ||
    (mode.type !== 'transfer' && !selectedAccountId) ||
    (mode.type === 'loan' && !personName.trim()) ||
    (mode.type === 'loan_payment' && parseFloat(amount || '0') > effectivePaymentRemaining)

  return (
    <div
      ref={modalRef}
      className="fixed inset-x-0 top-2 bottom-2 z-[100] bg-card overflow-hidden rounded-3xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-page transaction form */}
      <div className="w-full max-w-lg mx-auto bg-card animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <div className="flex items-center flex-1 min-w-0">
            {mode.type === 'transfer' ? (
              // Transfer: fromAccount + balance → toAccount + balance
              <div className="flex items-center justify-between flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0 max-w-[45%]">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (mode.fromAccount.color || '#6366f1') + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: mode.fromAccount.color || '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{mode.fromAccount.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(mode.fromAccount.balance, mode.fromAccount.currency)}
                    </BlurredAmount>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mx-2" />
                <div className="flex items-center gap-2 min-w-0 max-w-[45%]">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (mode.toAccount.color || '#6366f1') + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: mode.toAccount.color || '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{mode.toAccount.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(mode.toAccount.balance, mode.toAccount.currency)}
                    </BlurredAmount>
                  </div>
                </div>
              </div>
            ) : mode.type === 'income' ? (
              // Income: source → account
              <div className="flex items-center justify-between flex-1 min-w-0">
                <button
                  onClick={() => setShowSourcePicker(true)}
                  className="flex items-center gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-secondary/50 transition-colors min-w-0 max-w-[45%]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (selectedSource?.color || color) + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedSource?.color || color }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-semibold truncate">{selectedSource?.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(sourceMonthlyTotal, selectedSource?.currency || mainCurrency)}
                    </BlurredAmount>
                  </div>
                </button>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mx-2" />
                <button
                  onClick={() => setShowAccountPicker(true)}
                  className="flex items-center gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-secondary/50 transition-colors min-w-0 max-w-[45%]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (selectedAccount?.color || '#6366f1') + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedAccount?.color || '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-semibold truncate">{selectedAccount?.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(
                        selectedAccount?.balance || 0,
                        selectedAccount?.currency || ''
                      )}
                    </BlurredAmount>
                  </div>
                </button>
              </div>
            ) : mode.type === 'expense' ? (
              // Expense: account → category
              <div className="flex items-center justify-between flex-1 min-w-0">
                <button
                  onClick={() => setShowAccountPicker(true)}
                  className="flex items-center gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-secondary/50 transition-colors min-w-0 max-w-[45%]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (selectedAccount?.color || '#6366f1') + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedAccount?.color || '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-semibold truncate">{selectedAccount?.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(
                        selectedAccount?.balance || 0,
                        selectedAccount?.currency || ''
                      )}
                    </BlurredAmount>
                  </div>
                </button>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mx-2" />
                <button
                  onClick={() => setShowCategoryPicker(true)}
                  className="flex items-center gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-secondary/50 transition-colors min-w-0 max-w-[45%]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (selectedCategory?.color || color) + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedCategory?.color || color }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-semibold truncate">{selectedCategory?.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(categoryMonthlyTotal, mainCurrency)}
                    </BlurredAmount>
                  </div>
                </button>
              </div>
            ) : mode.type === 'loan' ? (
              // Loan: given/received toggle + person name + account
              <div className="flex-1 min-w-0 space-y-3">
                <h2 className="text-base font-semibold">
                  {mode.loan ? t('editLoan') : t('addLoan')}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoanType('given')}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-medium transition-all',
                      loanType === 'given'
                        ? 'bg-success/20 ring-2 ring-success text-success'
                        : 'bg-secondary/50 text-muted-foreground'
                    )}
                  >
                    {t('moneyILent')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanType('received')}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-medium transition-all',
                      loanType === 'received'
                        ? 'bg-destructive/20 ring-2 ring-destructive text-destructive'
                        : 'bg-secondary/50 text-muted-foreground'
                    )}
                  >
                    {t('moneyIBorrowed')}
                  </button>
                </div>
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  onTouchStart={handleInputTouchStart}
                  placeholder={
                    loanType === 'given' ? t('whoDidYouLendTo') : t('whoDidYouBorrowFrom')
                  }
                  className="w-full bg-secondary/50 rounded-xl px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrencyPicker(true)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <span className="text-sm text-muted-foreground">{t('currency')}</span>
                  <span className="text-sm font-medium">
                    {getAllCurrencies().find((c) => c.code === loanCurrency)?.symbol} {loanCurrency}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountPicker(true)}
                  className="w-full flex items-center gap-2 p-2 -m-2 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (selectedAccount?.color || '#6366f1') + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedAccount?.color || '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <p className="font-semibold truncate">{selectedAccount?.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(
                        selectedAccount?.balance || 0,
                        selectedAccount?.currency || ''
                      )}
                    </BlurredAmount>
                  </div>
                </button>
              </div>
            ) : mode.type === 'loan_payment' ? (
              // Loan payment: loan (person) → account
              <div className="flex items-center justify-between flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0 max-w-[45%]">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      mode.loan.type === 'given' ? 'bg-success/20' : 'bg-destructive/20'
                    )}
                  >
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        mode.loan.type === 'given' ? 'bg-success' : 'bg-destructive'
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{mode.loan.personName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {mode.loan.type === 'given' ? t('moneyGiven') : t('moneyReceived')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mx-2" />
                <button
                  onClick={() => setShowAccountPicker(true)}
                  className="flex items-center gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-secondary/50 transition-colors min-w-0 max-w-[45%]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (selectedAccount?.color || '#6366f1') + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedAccount?.color || '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-semibold truncate">{selectedAccount?.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(
                        selectedAccount?.balance || 0,
                        selectedAccount?.currency || ''
                      )}
                    </BlurredAmount>
                  </div>
                </button>
              </div>
            ) : null}
          </div>
          {mode.type === 'loan_payment' ? (
            <button
              onClick={handleDeleteLoan}
              disabled={isSubmitting}
              className="p-2 rounded-full hover:bg-destructive/20 touch-target flex-shrink-0"
              aria-label={t('delete')}
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </button>
          ) : (
            mode.type !== 'loan' &&
            isEditMode &&
            onDelete &&
            editTransaction && (
              <button
                onClick={() => onDelete(editTransaction)}
                className="p-2 rounded-full hover:bg-destructive/20 touch-target flex-shrink-0"
                aria-label={t('delete')}
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </button>
            )
          )}
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
                  activeField === 'source' ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary/50'
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
                    onFocus={() => setActiveField('source')}
                    onTouchStart={handleInputTouchStart}
                    placeholder="0"
                    className="w-full bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                  />
                  <span className="text-2xl font-bold tabular-nums text-muted-foreground">
                    {getCurrencySymbol(mode.fromAccount.currency)}
                  </span>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

              {/* Target Amount */}
              <div
                className={cn(
                  'flex-1 p-4 rounded-xl transition-all',
                  activeField === 'target' ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary/50'
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">{mode.toAccount.currency}</p>
                <div className="flex items-baseline gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(sanitizeAmount(e.target.value))}
                    onFocus={() => setActiveField('target')}
                    onTouchStart={handleInputTouchStart}
                    placeholder="0"
                    className="w-full bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                  />
                  <span className="text-2xl font-bold tabular-nums text-muted-foreground">
                    {getCurrencySymbol(mode.toAccount.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (isMultiCurrencyIncomeExpense || needsAccountConversion || isMultiCurrencyLoan) &&
          selectedAccount ? (
          // Multi-currency income/expense/loan
          <div className="p-4">
            <div className="flex items-center justify-center gap-2">
              {/* Source Amount - for income: source currency, for expense: account currency, for loans: loan currency */}
              <div
                className={cn(
                  'flex-1 p-3 rounded-xl transition-all',
                  activeField === 'source' ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary/50'
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {mode.type === 'income'
                    ? currentSourceCurrency
                    : mode.type === 'loan' || mode.type === 'loan_payment'
                      ? currentLoanCurrency
                      : selectedAccount.currency}
                </p>
                <div className="flex items-baseline gap-1">
                  <input
                    ref={amountInputRef}
                    autoFocus={!disableAutoFocus}
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                    onFocus={() => setActiveField('source')}
                    onTouchStart={handleInputTouchStart}
                    placeholder="0"
                    className="w-full bg-transparent text-xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                  />
                  <span className="text-xl font-bold tabular-nums text-muted-foreground">
                    {getCurrencySymbol(
                      mode.type === 'income'
                        ? currentSourceCurrency
                        : mode.type === 'loan' || mode.type === 'loan_payment'
                          ? currentLoanCurrency
                          : selectedAccount.currency
                    )}
                  </span>
                </div>
              </div>

              {/* MainCurrency Amount (for totals) - shown when source != mainCurrency */}
              {isMultiCurrencyIncomeExpense && (
                <>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div
                    className={cn(
                      'flex-1 p-3 rounded-xl transition-all',
                      activeField === 'target'
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
                        onFocus={() => setActiveField('target')}
                        onTouchStart={handleInputTouchStart}
                        placeholder="0"
                        className="w-full bg-transparent text-xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                      />
                      <span className="text-xl font-bold tabular-nums text-muted-foreground">
                        {getCurrencySymbol(mainCurrency)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Account Amount (for balance) - shown for income when account != source, or loans/payments when account != loan currency */}
              {(needsAccountConversion || isMultiCurrencyLoan) && (
                <>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div
                    className={cn(
                      'flex-1 p-3 rounded-xl transition-all',
                      activeField === 'account'
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
                        onFocus={() => setActiveField('account')}
                        onTouchStart={handleInputTouchStart}
                        placeholder="0"
                        className="w-full bg-transparent text-xl font-bold tabular-nums outline-none placeholder:text-muted-foreground"
                      />
                      <span className="text-xl font-bold tabular-nums text-muted-foreground">
                        {getCurrencySymbol(selectedAccount.currency)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          // Single currency: show one amount
          <div className="p-4">
            <div
              className={cn(
                'p-4 rounded-xl transition-all',
                activeField === 'source' ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary/50'
              )}
            >
              <div className="flex items-baseline justify-center gap-2">
                <input
                  ref={amountInputRef}
                  autoFocus={!disableAutoFocus}
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                  onFocus={() => setActiveField('source')}
                  onTouchStart={handleInputTouchStart}
                  placeholder="0"
                  className="w-full bg-transparent text-5xl font-bold tabular-nums text-foreground outline-none text-right placeholder:text-muted-foreground"
                />
                <span className="text-5xl font-bold tabular-nums text-muted-foreground">
                  {getCurrencySymbol(getCurrentCurrency())}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loan payment progress */}
        {mode.type === 'loan_payment' && (
          <div className="px-4 pb-3 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold">
                {formatCurrency(paymentRemaining, mode.loan.currency)}
              </span>
              <span className="text-sm text-muted-foreground">{t('remaining')}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  mode.loan.type === 'given' ? 'bg-success' : 'bg-destructive'
                )}
                style={{ width: `${(mode.loan.paidAmount / mode.loan.amount) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {formatCurrency(mode.loan.paidAmount, mode.loan.currency)} {t('paid').toLowerCase()}
              </span>
              <span>
                {formatCurrency(mode.loan.amount, mode.loan.currency)} {t('total').toLowerCase()}
              </span>
            </div>
            {!isEditMode && paymentRemaining > 0 && (
              <button
                type="button"
                onClick={() => setAmount(effectivePaymentRemaining.toString())}
                className="w-full py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                {t('payFullRemaining')} (
                {formatCurrency(effectivePaymentRemaining, mode.loan.currency)})
              </button>
            )}
          </div>
        )}

        {/* Comment */}
        <div className="px-4 pb-3">
          <div
            className={cn(
              'flex items-start gap-3 px-3 py-3 rounded-xl transition-all',
              activeField === 'comment' ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary/50'
            )}
          >
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <textarea
              ref={commentRef}
              placeholder={mode.type === 'loan' ? t('addNotesAboutLoan') : t('addComment')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onFocus={() => setActiveField('comment')}
              onTouchStart={handleInputTouchStart}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground min-h-[48px] max-h-[150px] overflow-y-auto"
            />
          </div>
        </div>

        {/* Date row */}
        {mode.type !== 'loan_payment' && (
          <div className="px-4 pb-4 flex justify-end items-center gap-2">
            <label
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer relative transition-all',
                activeField === 'date' ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary/50'
              )}
            >
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">
                {mode.type === 'loan'
                  ? dueDate
                    ? new Date(dueDate + 'T00:00:00').toLocaleDateString(
                        language === 'ru' ? 'ru-RU' : 'en-US',
                        { day: 'numeric', month: 'short' }
                      )
                    : t('dueDate')
                  : date === new Date().toISOString().split('T')[0]
                    ? t('today')
                    : new Date(date + 'T00:00:00').toLocaleDateString(
                        language === 'ru' ? 'ru-RU' : 'en-US',
                        { day: 'numeric', month: 'short' }
                      )}
              </span>
              <input
                type="date"
                lang={language}
                value={mode.type === 'loan' ? dueDate : date}
                onChange={(e) =>
                  mode.type === 'loan' ? setDueDate(e.target.value) : setDate(e.target.value)
                }
                onFocus={() => setActiveField('date')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            {mode.type === 'loan' && dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="p-2 rounded-full hover:bg-secondary touch-target"
                aria-label={t('clear')}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Submit Button - inline after comment */}
        <div ref={buttonContainerRef} className={cn('px-4 pb-4', buttonCovered && 'invisible')}>
          <button
            onClick={handleSubmit}
            disabled={submitDisabled}
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

      {/* Submit Button - fixed above keyboard when covered */}
      {buttonCovered && (
        <div className="absolute left-0 right-0 px-4 pb-2" style={{ bottom: keyboardHeight + 8 }}>
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSubmit}
              disabled={submitDisabled}
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

      {/* Account Picker Overlay */}
      {showAccountPicker && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">{t('selectAccount')}</h3>
            <button
              onClick={() => setShowAccountPicker(false)}
              className="p-2 rounded-full hover:bg-secondary touch-target"
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleAccountChange(account.id!)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                  account.id === selectedAccountId ? 'bg-primary/20' : 'hover:bg-secondary/50'
                )}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: account.color + '20' }}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{account.name}</p>
                  <BlurredAmount className="text-sm text-muted-foreground truncate block">
                    {formatCurrency(account.balance, account.currency)}
                  </BlurredAmount>
                </div>
                {account.id === selectedAccountId && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Income Source Picker Overlay */}
      {showSourcePicker && mode.type === 'income' && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">{t('incomeSources')}</h3>
            <button
              onClick={() => setShowSourcePicker(false)}
              className="p-2 rounded-full hover:bg-secondary touch-target"
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {incomeSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleSourceChange(source.id!)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                  source.id === selectedSourceId ? 'bg-primary/20' : 'hover:bg-secondary/50'
                )}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: source.color + '20' }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: source.color }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{source.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{source.currency}</p>
                </div>
                {source.id === selectedSourceId && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Picker Overlay */}
      {showCategoryPicker && mode.type === 'expense' && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">{t('categories')}</h3>
            <button
              onClick={() => setShowCategoryPicker(false)}
              className="p-2 rounded-full hover:bg-secondary touch-target"
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {expenseCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id!)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                  category.id === selectedCategoryId ? 'bg-primary/20' : 'hover:bg-secondary/50'
                )}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{category.name}</p>
                </div>
                {category.id === selectedCategoryId && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Currency Picker Overlay */}
      {showCurrencyPicker && mode.type === 'loan' && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">{t('selectCurrency')}</h3>
            <button
              onClick={() => setShowCurrencyPicker(false)}
              className="p-2 rounded-full hover:bg-secondary touch-target"
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {getAllCurrencies().map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setLoanCurrency(c.code)
                  setAccountAmount('')
                  setShowCurrencyPicker(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                  c.code === loanCurrency ? 'bg-primary/20' : 'hover:bg-secondary/50'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {c.symbol}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{c.code}</p>
                  <p className="text-sm text-muted-foreground truncate">{c.name}</p>
                </div>
                {c.code === loanCurrency && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
