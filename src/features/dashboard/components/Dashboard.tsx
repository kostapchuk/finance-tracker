import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { icons, type LucideIcon } from 'lucide-react'
import { MonthSelector } from '@/components/ui/MonthSelector'
import { CategoryTile } from '@/components/ui/CategoryTile'
import { AccountCard } from '@/components/ui/AccountCard'
import { QuickTransactionModal } from '@/components/ui/QuickTransactionModal'
import { DraggableItem } from '@/components/drag-drop/DraggableItem'
import { DroppableZone } from '@/components/drag-drop/DroppableZone'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { formatCurrency } from '@/utils/currency'
import { getStartOfMonth, getEndOfMonth } from '@/utils/date'
import { AccountForm } from '@/features/accounts/components/AccountForm'
import { CategoryForm } from '@/features/categories/components/CategoryForm'
import { IncomeSourceForm } from '@/features/income/components/IncomeSourceForm'
import type { Category, IncomeSource, Account, AccountType } from '@/database/types'

const defaultAccountIcons: Record<AccountType, keyof typeof icons> = {
  cash: 'Banknote',
  bank: 'Building2',
  crypto: 'Bitcoin',
  investment: 'TrendingUp',
  credit_card: 'CreditCard',
}

type TransactionMode =
  | { type: 'income'; source: IncomeSource; preselectedAccountId?: number }
  | { type: 'expense'; category: Category; preselectedAccountId?: number }
  | { type: 'transfer'; fromAccount: Account; toAccount: Account }
  | null

type DraggedItem =
  | { type: 'income'; source: IncomeSource }
  | { type: 'account'; account: Account }
  | null

export function Dashboard() {
  const accounts = useAppStore((state) => state.accounts)
  const transactions = useAppStore((state) => state.transactions)
  const categories = useAppStore((state) => state.categories)
  const incomeSources = useAppStore((state) => state.incomeSources)
  const selectedMonth = useAppStore((state) => state.selectedMonth)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t } = useLanguage()

  const [incomeExpanded, setIncomeExpanded] = useState(true)
  const [expensesExpanded, setExpensesExpanded] = useState(true)
  const [transactionMode, setTransactionMode] = useState<TransactionMode>(null)
  const [draggedItem, setDraggedItem] = useState<DraggedItem>(null)
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)
  const [accountFormOpen, setAccountFormOpen] = useState(false)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)

  // Configure sensors for both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )

  // Filter out loan categories (handled in Loans tab)
  const expenseCategories = useMemo(() => {
    return categories.filter((cat) => cat.categoryType !== 'loan')
  }, [categories])

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const startOfMonth = getStartOfMonth(selectedMonth)
    const endOfMonth = getEndOfMonth(selectedMonth)

    const monthlyTransactions = transactions.filter(
      (t) => new Date(t.date) >= startOfMonth && new Date(t.date) <= endOfMonth
    )

    // Income by source (use amount which is in source currency for tile display)
    const incomeBySource: Record<number, number> = {}
    // Total income in mainCurrency for proper aggregation
    let totalIncome = 0
    monthlyTransactions
      .filter((t) => t.type === 'income' && t.incomeSourceId)
      .forEach((t) => {
        // For tile display: use source currency amount
        incomeBySource[t.incomeSourceId!] = (incomeBySource[t.incomeSourceId!] || 0) + t.amount
        // For total: use mainCurrencyAmount when available, otherwise assume same currency
        totalIncome += t.mainCurrencyAmount ?? t.amount
      })

    // Expenses by category (use mainCurrencyAmount when available for proper aggregation)
    const expensesByCategory: Record<number, number> = {}
    let totalExpenses = 0
    monthlyTransactions
      .filter((t) => t.type === 'expense' && t.categoryId)
      .forEach((t) => {
        const mainAmount = t.mainCurrencyAmount ?? t.amount
        expensesByCategory[t.categoryId!] = (expensesByCategory[t.categoryId!] || 0) + mainAmount
        totalExpenses += mainAmount
      })

    return { incomeBySource, expensesByCategory, totalIncome, totalExpenses }
  }, [transactions, selectedMonth])

  const navigateToHistoryWithCategory = useAppStore((state) => state.navigateToHistoryWithCategory)

  const handleCategoryClick = (category: Category) => {
    navigateToHistoryWithCategory(category.id!)
  }

  const handleCloseModal = () => {
    setTransactionMode(null)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current

    if (data?.type === 'income') {
      setDraggedItem({ type: 'income', source: data.source as IncomeSource })
    } else if (data?.type === 'account') {
      setDraggedItem({ type: 'account', account: data.account as Account })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedItem(null)

    if (!over) return

    const dragData = active.data.current
    const dropData = over.data.current

    if (!dragData || !dropData) return

    // Income dropped onto Account → record income
    if (dragData.type === 'income' && dropData.type === 'account') {
      const account = dropData.account as Account
      setTransactionMode({
        type: 'income',
        source: dragData.source as IncomeSource,
        preselectedAccountId: account.id,
      })
    }
    // Account dropped onto Category → record expense
    else if (dragData.type === 'account' && dropData.type === 'category') {
      const account = dragData.account as Account
      const category = dropData.category as Category
      setTransactionMode({
        type: 'expense',
        category,
        preselectedAccountId: account.id,
      })
    }
    // Account dropped onto another Account → transfer
    else if (dragData.type === 'account' && dropData.type === 'account') {
      const fromAccount = dragData.account as Account
      const toAccount = dropData.account as Account
      if (fromAccount.id !== toAccount.id) {
        setTransactionMode({
          type: 'transfer',
          fromAccount,
          toAccount,
        })
      }
    }
  }

  // Check what's being dragged to show appropriate drop hints
  const isDraggingIncome = draggedItem?.type === 'income'
  const isDraggingAccount = draggedItem?.type === 'account'

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col min-h-full">
        {/* Month Selector */}
        <MonthSelector />

        {/* Income Section - Draggable */}
        <section className="px-1 py-1">
          <div className="bg-secondary/50 rounded-xl p-2">
          <button
            onClick={() => setIncomeExpanded(!incomeExpanded)}
            className="flex items-center justify-between w-full touch-target px-1"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('income')}
              </h3>
              <span className="font-semibold text-foreground">
                {formatCurrency(monthlyData.totalIncome, mainCurrency)}
              </span>
              {incomeExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span
              role="button"
              className="p-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition-colors"
              onClick={(e) => { e.stopPropagation(); setIncomeFormOpen(true) }}
            >
              <Plus className="h-5 w-5" />
            </span>
          </button>

          {incomeExpanded && (
            <div className="grid grid-cols-4 gap-2 mt-1 max-h-48 overflow-y-auto">
              {incomeSources.map((source) => (
                <DraggableItem
                  key={source.id}
                  id={`income-${source.id}`}
                  data={{ type: 'income', source }}
                >
                  {(handle) => (
                    <CategoryTile
                      name={source.name}
                      amount={monthlyData.incomeBySource[source.id!] || 0}
                      currency={source.currency || mainCurrency}
                      color={source.color}
                      icon={source.icon}
                      type="income"
                      dragHandleProps={{ ...handle.listeners, ...handle.attributes }}
                    />
                  )}
                </DraggableItem>
              ))}
            </div>
          )}
          </div>
        </section>

        {/* Accounts Section - Draggable AND Droppable (for income and transfers) */}
        <section className="px-1 py-1">
          <div className="bg-secondary/50 rounded-xl p-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('accounts')}
                </h3>
                {isDraggingIncome && (
                  <span className="text-xs text-primary">{t('dropIncomeHere')}</span>
                )}
                {isDraggingAccount && (
                  <span className="text-xs text-primary">{t('dropHere')}</span>
                )}
              </div>
              <span
                role="button"
                className="p-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition-colors"
                onClick={() => setAccountFormOpen(true)}
              >
                <Plus className="h-5 w-5" />
              </span>
            </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {accounts.map((account) => (
              <DroppableZone
                key={account.id}
                id={`account-drop-${account.id}`}
                data={{ type: 'account', account }}
              >
                <DraggableItem
                  id={`account-${account.id}`}
                  data={{ type: 'account', account }}
                >
                  {(handle) => (
                    <AccountCard
                      name={account.name}
                      type={account.type}
                      balance={account.balance}
                      currency={account.currency}
                      color={account.color}
                      icon={account.icon}
                      dragHandleProps={{ ...handle.listeners, ...handle.attributes }}
                    />
                  )}
                </DraggableItem>
              </DroppableZone>
            ))}
          </div>
          </div>
        </section>

        {/* Expenses Section - Droppable (for accounts) */}
        <section className="px-1 py-1">
          <div className="bg-secondary/50 rounded-xl p-2">
          <button
            onClick={() => setExpensesExpanded(!expensesExpanded)}
            className="flex items-center justify-between w-full touch-target px-1"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('expenses')}
              </h3>
              <span className="font-semibold text-foreground">
                {formatCurrency(monthlyData.totalExpenses, mainCurrency)}
              </span>
              {isDraggingAccount && (
                <span className="text-xs text-primary">{t('dropHere')}</span>
              )}
              {expensesExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span
              role="button"
              className="p-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition-colors"
              onClick={(e) => { e.stopPropagation(); setCategoryFormOpen(true) }}
            >
              <Plus className="h-5 w-5" />
            </span>
          </button>

          {expensesExpanded && (
            <div className="grid grid-cols-4 gap-2 mt-1">
              {expenseCategories.map((category) => (
                <DroppableZone
                  key={category.id}
                  id={`category-${category.id}`}
                  data={{ type: 'category', category }}
                >
                  <CategoryTile
                    name={category.name}
                    amount={monthlyData.expensesByCategory[category.id!] || 0}
                    currency={mainCurrency}
                    color={category.color}
                    icon={category.icon}
                    type="expense"
                    onClick={() => handleCategoryClick(category)}
                  />
                </DroppableZone>
              ))}
            </div>
          )}
          </div>
        </section>

        {/* Quick Transaction Modal */}
        {transactionMode && (
          <QuickTransactionModal
            mode={transactionMode}
            accounts={accounts}
            preselectedAccountId={'preselectedAccountId' in transactionMode ? transactionMode.preselectedAccountId : undefined}
            onClose={handleCloseModal}
          />
        )}

        {/* Drag Overlay - only the icon circle follows the cursor */}
        <DragOverlay>
          {draggedItem && (() => {
            const color = draggedItem.type === 'income'
              ? draggedItem.source.color
              : draggedItem.account.color
            const iconName = draggedItem.type === 'income'
              ? (draggedItem.source.icon || 'Circle')
              : (draggedItem.account.icon || defaultAccountIcons[draggedItem.account.type] || 'Wallet')
            const Icon: LucideIcon = iconName in icons
              ? icons[iconName as keyof typeof icons]
              : icons.Circle
            return (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl scale-110"
                style={{ backgroundColor: color + '20' }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
            )
          })()}
        </DragOverlay>
      </div>

      <IncomeSourceForm open={incomeFormOpen} onClose={() => setIncomeFormOpen(false)} />
      <AccountForm open={accountFormOpen} onClose={() => setAccountFormOpen(false)} />
      <CategoryForm open={categoryFormOpen} onClose={() => setCategoryFormOpen(false)} />
    </DndContext>
  )
}
