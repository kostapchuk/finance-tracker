import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'

import { DraggableItem } from '@/components/drag-drop/DraggableItem'
import { DroppableZone } from '@/components/drag-drop/DroppableZone'
import { AccountCard } from '@/components/ui/AccountCard'
import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { CategoryTile } from '@/components/ui/CategoryTile'
import { MonthSelector } from '@/components/ui/MonthSelector'
import type { Category, IncomeSource, Account, AccountType } from '@/database/types'
import { useAccounts, useTransactions, useCategories, useIncomeSources } from '@/hooks/useDataHooks'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency } from '@/utils/currency'
import { getStartOfMonth, getEndOfMonth } from '@/utils/date'
import { getIcon } from '@/utils/icons'

const QuickTransactionModal = lazy(() =>
  import('@/components/ui/QuickTransactionModal').then((m) => ({
    default: m.QuickTransactionModal,
  }))
)
const AccountForm = lazy(() =>
  import('@/features/accounts/components/AccountForm').then((m) => ({ default: m.AccountForm }))
)
const CategoryForm = lazy(() =>
  import('@/features/categories/components/CategoryForm').then((m) => ({ default: m.CategoryForm }))
)
const IncomeSourceForm = lazy(() =>
  import('@/features/income/components/IncomeSourceForm').then((m) => ({
    default: m.IncomeSourceForm,
  }))
)

const defaultAccountIcons: Record<AccountType, string> = {
  cash: 'Banknote',
  bank: 'Building2',
  crypto: 'Bitcoin',
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
  const { data: accounts = [] } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: incomeSources = [] } = useIncomeSources()
  const selectedMonth = useAppStore((state) => state.selectedMonth)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const onboardingStep = useAppStore((state) => state.onboardingStep)
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep)
  const { t } = useLanguage()

  const [incomeExpanded, setIncomeExpanded] = useState(() => {
    const saved = localStorage.getItem('incomeExpanded')
    return saved === null ? true : saved === 'true'
  })
  const [expensesExpanded, setExpensesExpanded] = useState(true)
  const [transactionMode, setTransactionMode] = useState<TransactionMode>(null)
  const [draggedItem, setDraggedItem] = useState<DraggedItem>(null)
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)
  const [accountFormOpen, setAccountFormOpen] = useState(false)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)

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

  const visibleIncomeSources = useMemo(() => {
    return incomeSources.filter((s) => !s.hiddenFromDashboard)
  }, [incomeSources])

  const visibleAccounts = useMemo(() => {
    return accounts.filter((a) => !a.hiddenFromDashboard)
  }, [accounts])

  const expenseCategories = useMemo(() => {
    return categories.filter((cat) => cat.categoryType !== 'loan' && !cat.hiddenFromDashboard)
  }, [categories])

  const monthlyData = useMemo(() => {
    const startOfMonth = getStartOfMonth(selectedMonth)
    const endOfMonth = getEndOfMonth(selectedMonth)

    const monthlyTransactions = transactions.filter(
      (t) => new Date(t.date) >= startOfMonth && new Date(t.date) <= endOfMonth
    )

    const incomeBySource: Record<number, number> = {}
    let totalIncome = 0
    monthlyTransactions
      .filter((t) => t.type === 'income' && t.incomeSourceId)
      .forEach((t) => {
        incomeBySource[t.incomeSourceId!] = (incomeBySource[t.incomeSourceId!] || 0) + t.amount
        totalIncome += t.mainCurrencyAmount ?? t.amount
      })

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
  const navigateToHistoryWithAccount = useAppStore((state) => state.navigateToHistoryWithAccount)

  const handleCategoryClick = (category: Category) => {
    navigateToHistoryWithCategory(category.id!)
  }

  const handleAccountClick = (account: Account) => {
    navigateToHistoryWithAccount(account.id!)
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

    if (dragData.type === 'income' && dropData.type === 'account') {
      const account = dropData.account as Account
      setTransactionMode({
        type: 'income',
        source: dragData.source as IncomeSource,
        preselectedAccountId: account.id,
      })
      if (onboardingStep === 2) {
        setOnboardingStep(3)
      }
    } else if (dragData.type === 'account' && dropData.type === 'category') {
      const account = dragData.account as Account
      const category = dropData.category as Category
      setTransactionMode({
        type: 'expense',
        category,
        preselectedAccountId: account.id,
      })
      if (onboardingStep === 3) {
        setOnboardingStep(4)
      }
    } else if (dragData.type === 'account' && dropData.type === 'account') {
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

  const isDraggingIncome = draggedItem?.type === 'income'
  const isDraggingAccount = draggedItem?.type === 'account'

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col min-h-full">
        <MonthSelector />

        <section className="px-1 py-1">
          <div className="bg-secondary/50 rounded-xl p-2">
            <div className="flex items-center justify-between w-full touch-target px-1">
              <button
                onClick={() => {
                  const newValue = !incomeExpanded
                  setIncomeExpanded(newValue)
                  localStorage.setItem('incomeExpanded', String(newValue))
                }}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('income')}
                </h3>
                <BlurredAmount className="font-semibold text-foreground">
                  {formatCurrency(monthlyData.totalIncome, mainCurrency)}
                </BlurredAmount>
                {incomeExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                className="p-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition-colors"
                onClick={() => setIncomeFormOpen(true)}
                aria-label={t('addIncomeSource')}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {incomeExpanded && (
              <div className="grid grid-cols-4 gap-2 mt-1 max-h-48 overflow-y-auto">
                {visibleIncomeSources.map((source) => (
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

        <section className="px-1 py-1">
          <div className="bg-secondary/50 rounded-xl p-2">
            <div className="flex items-center justify-between mb-1 px-1 touch-target">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('accounts')}
                </h3>
                {isDraggingIncome && (
                  <span className="text-xs text-primary">{t('dropIncomeHere')}</span>
                )}
                {isDraggingAccount && <span className="text-xs text-primary">{t('dropHere')}</span>}
              </div>
              <button
                type="button"
                className="p-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition-colors"
                onClick={() => setAccountFormOpen(true)}
                aria-label={t('addAccount')}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {visibleAccounts.map((account) => (
                <DroppableZone
                  key={account.id}
                  id={`account-drop-${account.id}`}
                  data={{ type: 'account', account }}
                >
                  <DraggableItem id={`account-${account.id}`} data={{ type: 'account', account }}>
                    {(handle) => (
                      <AccountCard
                        name={account.name}
                        type={account.type}
                        balance={account.balance}
                        currency={account.currency}
                        color={account.color}
                        icon={account.icon}
                        onClick={() => handleAccountClick(account)}
                        dragHandleProps={{ ...handle.listeners, ...handle.attributes }}
                      />
                    )}
                  </DraggableItem>
                </DroppableZone>
              ))}
            </div>
          </div>
        </section>

        <section className="px-1 py-1">
          <div className="bg-secondary/50 rounded-xl p-2">
            <div className="flex items-center justify-between w-full touch-target px-1">
              <button
                onClick={() => setExpensesExpanded(!expensesExpanded)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('expenses')}
                </h3>
                <BlurredAmount className="font-semibold text-foreground">
                  {formatCurrency(monthlyData.totalExpenses, mainCurrency)}
                </BlurredAmount>
                {isDraggingAccount && <span className="text-xs text-primary">{t('dropHere')}</span>}
                {expensesExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                className="p-2 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition-colors"
                onClick={() => setCategoryFormOpen(true)}
                aria-label={t('addCategory')}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

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

        {transactionMode && (
          <Suspense fallback={null}>
            <QuickTransactionModal
              mode={transactionMode}
              accounts={accounts}
              preselectedAccountId={
                'preselectedAccountId' in transactionMode
                  ? transactionMode.preselectedAccountId
                  : undefined
              }
              onClose={handleCloseModal}
            />
          </Suspense>
        )}

        <DragOverlay>
          {draggedItem &&
            (() => {
              const color =
                draggedItem.type === 'income' ? draggedItem.source.color : draggedItem.account.color
              const iconName =
                draggedItem.type === 'income'
                  ? draggedItem.source.icon || 'Circle'
                  : draggedItem.account.icon ||
                    defaultAccountIcons[draggedItem.account.type] ||
                    'Wallet'
              const Icon = getIcon(iconName)
              return (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl scale-110"
                  style={{ backgroundColor: color + '20' }}
                >
                  <Icon className="h-6 w-6" style={{ color }} />
                </div>
              )
            })()}
        </DragOverlay>
      </div>

      <Suspense fallback={null}>
        <IncomeSourceForm open={incomeFormOpen} onClose={() => setIncomeFormOpen(false)} />
        <AccountForm open={accountFormOpen} onClose={() => setAccountFormOpen(false)} />
        <CategoryForm open={categoryFormOpen} onClose={() => setCategoryFormOpen(false)} />
      </Suspense>
    </DndContext>
  )
}
