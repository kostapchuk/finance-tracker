import { useQueryClient } from '@tanstack/react-query'
import { X, Calendar, MessageSquare, ArrowRight, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { transactionRepo, accountRepo } from '@/database/repositories'
import type { Category, IncomeSource, Account, Transaction } from '@/database/types'
import {
  useIncomeSources,
  useCategories,
  useTransactions,
  useLoans,
  useSettings,
} from '@/hooks/useDataHooks'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { getCurrencySymbol, formatCurrency } from '@/utils/currency'
import { getStartOfMonth, getEndOfMonth } from '@/utils/date'
import { reverseTransactionBalance } from '@/utils/transactionBalance'

export type TransactionMode =
  | { type: 'income'; source: IncomeSource; preselectedAccountId?: number }
  | { type: 'expense'; category: Category; preselectedAccountId?: number }
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
  const selectedMonth = useAppStore((state) => state.selectedMonth)
  const mainCurrencyFromStore = useAppStore((state) => state.mainCurrency)
  const { t, language } = useLanguage()

  const { data: incomeSourcesData = [] } = useIncomeSources()
  const { data: categoriesData = [] } = useCategories()
  const { data: transactionsData = [] } = useTransactions()
  const { data: loansData = [] } = useLoans()
  const { data: settingsData } = useSettings()

  const incomeSources = incomeSourcesData
  const categories = categoriesData
  const transactions = transactionsData
  const loans = loansData
  const mainCurrency = settingsData?.defaultCurrency || mainCurrencyFromStore

  const queryClient = useQueryClient()

  const isEditMode = !!editTransaction

  const [amount, setAmount] = useState('')
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
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showFromAccountPicker, setShowFromAccountPicker] = useState(false)
  const [showToAccountPicker, setShowToAccountPicker] = useState(false)
  const [fromAccountId, setFromAccountId] = useState<number | undefined>(
    mode.type === 'transfer' ? mode.fromAccount.id : undefined
  )
  const [toAccountId, setToAccountId] = useState<number | undefined>(
    mode.type === 'transfer' ? mode.toAccount.id : undefined
  )
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [comment, setComment] = useState('')
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

  // Get transfer accounts
  const fromAccount =
    mode.type === 'transfer'
      ? accounts.find((a) => a.id === fromAccountId) || mode.fromAccount
      : null
  const toAccount =
    mode.type === 'transfer' ? accounts.find((a) => a.id === toAccountId) || mode.toAccount : null

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
    mode.type === 'transfer' && fromAccount?.currency !== toAccount?.currency

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

  const handleFromAccountChange = (newAccountId: number) => {
    if (newAccountId === toAccountId) return
    setFromAccountId(newAccountId)
    setTargetAmount('')
    setShowFromAccountPicker(false)
  }

  const handleToAccountChange = (newAccountId: number) => {
    if (newAccountId === fromAccountId) return
    setToAccountId(newAccountId)
    setTargetAmount('')
    setShowToAccountPicker(false)
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
    if (mode.type === 'income')
      return accounts.find((a) => a.id === selectedAccountId)?.currency || 'USD'
    if (mode.type === 'expense')
      return accounts.find((a) => a.id === selectedAccountId)?.currency || 'USD'
    return activeField === 'source' ? fromAccount?.currency || 'USD' : toAccount?.currency || 'USD'
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
    if (isNaN(numAmount) || numAmount <= 0) return

    const today = new Date().toISOString().split('T')[0]
    const transactionDate = date === today ? new Date() : new Date(date + 'T12:00:00')

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

    try {
      // If editing, first reverse the old transaction's balance effects
      if (isEditMode && editTransaction) {
        await reverseTransactionBalance(editTransaction, loans)
      }

      if (mode.type === 'transfer') {
        // Handle transfer between accounts - single transaction record
        const numTargetAmount = isMultiCurrencyTransfer ? parseFloat(targetAmount) : numAmount

        const transactionData = {
          type: 'transfer' as const,
          amount: numAmount,
          currency: fromAccount?.currency || 'USD',
          accountId: fromAccountId,
          toAccountId: toAccountId,
          toAmount: isMultiCurrencyTransfer ? numTargetAmount : undefined,
          date: transactionDate,
          comment: comment || undefined,
        }

        if (isEditMode && editTransaction?.id) {
          await transactionRepo.update(editTransaction.id, transactionData)
        } else {
          await transactionRepo.create(transactionData)
        }

        // Update balances
        await accountRepo.updateBalance(fromAccountId!, -numAmount)
        await accountRepo.updateBalance(toAccountId!, numTargetAmount)
      } else {
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
            date: transactionDate,
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
            date: transactionDate,
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
      }

      const newTransactions = await transactionRepo.getAll()
      const newAccounts = await accountRepo.getAll()
      queryClient.setQueryData(['transactions'], newTransactions)
      queryClient.setQueryData(['accounts'], newAccounts)

      onClose()
    } catch (error) {
      console.error('Failed to save transaction:', error)
    }
  }

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
                <button
                  onClick={() => setShowFromAccountPicker(true)}
                  className="flex items-center gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-secondary/50 transition-colors min-w-0 max-w-[45%]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (fromAccount?.color || '#6366f1') + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: fromAccount?.color || '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-semibold truncate">{fromAccount?.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(fromAccount?.balance || 0, fromAccount?.currency || 'USD')}
                    </BlurredAmount>
                  </div>
                </button>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mx-2" />
                <button
                  onClick={() => setShowToAccountPicker(true)}
                  className="flex items-center gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-secondary/50 transition-colors min-w-0 max-w-[45%]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (toAccount?.color || '#6366f1') + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: toAccount?.color || '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-semibold truncate">{toAccount?.name}</p>
                    <BlurredAmount className="text-sm text-muted-foreground truncate block">
                      {formatCurrency(toAccount?.balance || 0, toAccount?.currency || 'USD')}
                    </BlurredAmount>
                  </div>
                </button>
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
            ) : null}
          </div>
          {isEditMode && onDelete && editTransaction && (
            <button
              onClick={() => onDelete(editTransaction)}
              className="p-2 rounded-full hover:bg-destructive/20 touch-target flex-shrink-0"
              aria-label={t('delete')}
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </button>
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
                <p className="text-xs text-muted-foreground mb-1">{fromAccount?.currency}</p>
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
                    {getCurrencySymbol(fromAccount?.currency || 'USD')}
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
                <p className="text-xs text-muted-foreground mb-1">{toAccount?.currency}</p>
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
                    {getCurrencySymbol(toAccount?.currency || 'USD')}
                  </span>
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
                  activeField === 'source' ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary/50'
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {mode.type === 'income' ? currentSourceCurrency : selectedAccount.currency}
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
                      mode.type === 'income' ? currentSourceCurrency : selectedAccount.currency
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

              {/* Account Amount (for balance) - shown for income when account != source */}
              {needsAccountConversion && (
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
              placeholder={t('addComment')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onFocus={() => setActiveField('comment')}
              onTouchStart={handleInputTouchStart}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground min-h-[48px] max-h-[150px] overflow-y-auto"
            />
          </div>
        </div>

        {/* Date row */}
        <div className="px-4 pb-4 flex justify-end">
          <label
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer relative transition-all',
              activeField === 'date' ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary/50'
            )}
          >
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              {date === new Date().toISOString().split('T')[0]
                ? t('today')
                : new Date(date + 'T00:00:00').toLocaleDateString(
                    language === 'ru' ? 'ru-RU' : 'en-US',
                    { day: 'numeric', month: 'short' }
                  )}
            </span>
            <input
              type="date"
              lang={language}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onFocus={() => setActiveField('date')}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Submit Button - inline after comment */}
        <div ref={buttonContainerRef} className={cn('px-4 pb-4', buttonCovered && 'invisible')}>
          <button
            onClick={handleSubmit}
            disabled={
              !amount ||
              (isMultiCurrencyTransfer && !targetAmount) ||
              (isMultiCurrencyIncomeExpense && !targetAmount) ||
              (needsAccountConversion && !accountAmount) ||
              (mode.type !== 'transfer' && !selectedAccountId)
            }
            className={cn(
              'w-full py-4 rounded-xl text-lg font-semibold transition-colors touch-target',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 active:bg-primary/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isEditMode ? t('update') : t('save')}
          </button>
        </div>
      </div>

      {/* Submit Button - fixed above keyboard when covered */}
      {buttonCovered && (
        <div className="absolute left-0 right-0 px-4 pb-2" style={{ bottom: keyboardHeight + 8 }}>
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSubmit}
              disabled={
                !amount ||
                (isMultiCurrencyTransfer && !targetAmount) ||
                (isMultiCurrencyIncomeExpense && !targetAmount) ||
                (needsAccountConversion && !accountAmount) ||
                (mode.type !== 'transfer' && !selectedAccountId)
              }
              className={cn(
                'w-full py-4 rounded-xl text-lg font-semibold transition-colors touch-target',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 active:bg-primary/80',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isEditMode ? t('update') : t('save')}
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

      {/* From Account Picker Overlay for Transfer */}
      {showFromAccountPicker && mode.type === 'transfer' && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">{t('selectAccount')}</h3>
            <button
              onClick={() => setShowFromAccountPicker(false)}
              className="p-2 rounded-full hover:bg-secondary touch-target"
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {accounts
              .filter((account) => account.id !== toAccountId)
              .map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleFromAccountChange(account.id!)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                    account.id === fromAccountId ? 'bg-primary/20' : 'hover:bg-secondary/50'
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
                  {account.id === fromAccountId && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* To Account Picker Overlay for Transfer */}
      {showToAccountPicker && mode.type === 'transfer' && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">{t('selectAccount')}</h3>
            <button
              onClick={() => setShowToAccountPicker(false)}
              className="p-2 rounded-full hover:bg-secondary touch-target"
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {accounts
              .filter((account) => account.id !== fromAccountId)
              .map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleToAccountChange(account.id!)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                    account.id === toAccountId ? 'bg-primary/20' : 'hover:bg-secondary/50'
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
                  {account.id === toAccountId && (
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
