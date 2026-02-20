import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Wallet,
  Tags,
  DollarSign,
  Download,
  Upload,
  Trash2,
  ChevronRight,
  Plus,
  Pencil,
  AlertTriangle,
  AlertCircle,
  Coins,
  Globe,
  GripVertical,
  EyeOff,
  FileSpreadsheet,
  RefreshCw,
  WifiOff,
  Check,
  Key,
  Copy,
} from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'

import { version } from '../../../../package.json'

import { CurrencyForm } from './CurrencyForm'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useServiceWorker } from '@/contexts/ServiceWorkerContext'
import { localCache } from '@/database/localCache'
import {
  isCloudUnlocked,
  setCloudUnlocked,
  isMigrationComplete,
  isCloudReady,
} from '@/database/migration'
import {
  accountRepo,
  categoryRepo,
  incomeSourceRepo,
  customCurrencyRepo,
  transactionRepo,
  loanRepo,
} from '@/database/repositories'
import { supabaseApi } from '@/database/supabaseApi'
import { syncService } from '@/database/syncService'
import type {
  Account,
  Category,
  IncomeSource,
  CustomCurrency,
  Transaction,
  Loan,
} from '@/database/types'
import { AccountForm } from '@/features/accounts/components/AccountForm'
import { CategoryForm } from '@/features/categories/components/CategoryForm'
import {
  BudgetOkImportWizard,
  type SavedImportState,
} from '@/features/import/components/BudgetOkImportWizard'
import { IncomeSourceForm } from '@/features/income/components/IncomeSourceForm'
import {
  useAccounts,
  useIncomeSources,
  useCategories,
  useTransactions,
  useLoans,
  useCustomCurrencies,
} from '@/hooks/useDataHooks'
import { useLanguage } from '@/hooks/useLanguage'
import { useSync } from '@/hooks/useSync'
import { getUserId } from '@/lib/deviceId'
import { queryClient } from '@/lib/queryClient'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency, getAllCurrencies } from '@/utils/currency'
import type { Language } from '@/utils/i18n'

type ManagementSection = 'accounts' | 'categories' | 'income' | 'currencies' | null

// Helper to generate temp IDs for imported data (matches repositories.ts pattern)
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// Helper to format time until next retry
function formatTimeUntil(date: Date | null): string {
  if (!date) return ''
  const now = new Date()
  const diff = Math.max(0, date.getTime() - now.getTime())

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function SettingsPage() {
  const { data: accounts = [] } = useAccounts()
  const { data: incomeSources = [] } = useIncomeSources()
  const { data: categories = [] } = useCategories()
  const { data: transactions = [] } = useTransactions()
  const { data: loans = [] } = useLoans()
  const { data: customCurrencies = [] } = useCustomCurrencies()
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const setMainCurrency = useAppStore((state) => state.setMainCurrency)
  const blurFinancialFigures = useAppStore((state) => state.blurFinancialFigures)
  const setBlurFinancialFigures = useAppStore((state) => state.setBlurFinancialFigures)
  const showMigrationDialogManually = useAppStore((state) => state.showMigrationDialogManually)
  const { language, setLanguage, t } = useLanguage()
  const { needRefresh, updateServiceWorker } = useServiceWorker()
  const { status, pendingCount, isOffline, sync, nextRetryAt } = useSync()

  const [activeSection, setActiveSection] = useState<ManagementSection>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [accountFormOpen, setAccountFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null)
  const [currencyFormOpen, setCurrencyFormOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<CustomCurrency | null>(null)
  const [importWizardOpen, setImportWizardOpen] = useState(false)
  const [savedImportState, setSavedImportState] = useState<SavedImportState | null>(null)

  // Export/Import confirmation dialogs
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)

  // Cloud unlock click tracking
  const [versionClickCount, setVersionClickCount] = useState(0)
  const [firstClickTime, setFirstClickTime] = useState<number | null>(null)
  const [cloudUnlocked, setCloudUnlockedState] = useState(isCloudUnlocked())
  const [migrationComplete, setMigrationCompleteState] = useState(isMigrationComplete())

  // Timer tick for updating next retry time display
  const [, setTick] = useState(0)

  useEffect(() => {
    setCloudUnlockedState(isCloudUnlocked())
    setMigrationCompleteState(isMigrationComplete())
  }, [])

  // Update timer every second for next retry display
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleVersionClick = useCallback(() => {
    // If both cloud is unlocked and migration is complete, no action needed
    if (cloudUnlocked && migrationComplete) return

    const now = Date.now()

    if (firstClickTime === null || now - firstClickTime > 5000) {
      setVersionClickCount(1)
      setFirstClickTime(now)
    } else {
      const newCount = versionClickCount + 1
      setVersionClickCount(newCount)

      if (newCount >= 5) {
        // Only set cloud unlocked if not already
        if (!cloudUnlocked) {
          setCloudUnlocked()
          setCloudUnlockedState(true)
        }
        setVersionClickCount(0)
        setFirstClickTime(null)
        showMigrationDialogManually().then(() => {
          setMigrationCompleteState(isMigrationComplete())
        })
      }
    }
  }, [
    cloudUnlocked,
    migrationComplete,
    firstClickTime,
    versionClickCount,
    showMigrationDialogManually,
  ])

  // Drag-to-reorder sensors
  const reorderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleReorder = useCallback(
    async (
      event: DragEndEvent,
      items: { id?: number }[],
      repo: { update: (id: number, updates: Record<string, unknown>) => Promise<unknown> },
      refresh: () => Promise<void>
    ) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      // Reorder array
      const reordered = [...items]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      // Update sortOrder for all items
      await Promise.all(
        reordered.map((item, index) =>
          item.id ? repo.update(item.id, { sortOrder: index }) : Promise.resolve()
        )
      )
      await refresh()
    },
    []
  )

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExportJSON = async () => {
    setExportDialogOpen(false)
    setIsExporting(true)
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        accounts,
        incomeSources,
        categories,
        transactions,
        loans,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.append(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingImportFile(file)
    setImportDialogOpen(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConfirmImport = async () => {
    if (!pendingImportFile) return

    setImportDialogOpen(false)

    setIsImporting(true)
    setImportError('')
    setImportSuccess(false)

    try {
      const text = await pendingImportFile.text()
      const data = JSON.parse(text)

      if (!data.version || !data.accounts || !data.transactions) {
        throw new Error('Invalid backup file format')
      }

      await localCache.clearAll()

      const userId = getUserId()
      const cloudReady = isCloudReady()

      // Generate ID mappings (old ID → new temp ID)
      const accountIdMap = new Map<number | undefined, string>()
      const incomeSourceIdMap = new Map<number | undefined, string>()
      const categoryIdMap = new Map<number | undefined, string>()
      const loanIdMap = new Map<number | undefined, string>()

      // Collect items for sync queue
      const syncQueueAccounts: { tempId: string; data: Record<string, unknown> }[] = []
      const syncQueueIncomeSources: { tempId: string; data: Record<string, unknown> }[] = []
      const syncQueueCategories: { tempId: string; data: Record<string, unknown> }[] = []
      const syncQueueLoans: { tempId: string; data: Record<string, unknown> }[] = []
      const syncQueueTransactions: { tempId: string; data: Record<string, unknown> }[] = []

      // Import accounts with new IDs
      if (data.accounts?.length) {
        const accountsToImport = data.accounts.map((a: Record<string, unknown>) => {
          const oldId = a.id as number | undefined
          const newId = generateTempId()
          if (oldId !== undefined) {
            accountIdMap.set(oldId, newId)
          }
          const account = {
            ...a,
            id: newId as unknown as number,
            userId,
            createdAt: new Date(a.createdAt as string),
            updatedAt: new Date(a.updatedAt as string),
          } as Account
          if (cloudReady) {
            syncQueueAccounts.push({
              tempId: newId,
              data: { ...account, id: newId },
            })
          }
          return account
        })
        await localCache.accounts.putAll(accountsToImport)
      }

      // Import income sources with new IDs
      if (data.incomeSources?.length) {
        const sourcesToImport = data.incomeSources.map((s: Record<string, unknown>) => {
          const oldId = s.id as number | undefined
          const newId = generateTempId()
          if (oldId !== undefined) {
            incomeSourceIdMap.set(oldId, newId)
          }
          const source = {
            ...s,
            id: newId as unknown as number,
            userId,
            createdAt: new Date(s.createdAt as string),
            updatedAt: new Date(s.updatedAt as string),
          } as IncomeSource
          if (cloudReady) {
            syncQueueIncomeSources.push({
              tempId: newId,
              data: { ...source, id: newId },
            })
          }
          return source
        })
        await localCache.incomeSources.putAll(sourcesToImport)
      }

      // Import categories with new IDs
      if (data.categories?.length) {
        const categoriesToImport = data.categories.map((c: Record<string, unknown>) => {
          const oldId = c.id as number | undefined
          const newId = generateTempId()
          if (oldId !== undefined) {
            categoryIdMap.set(oldId, newId)
          }
          const category = {
            ...c,
            id: newId as unknown as number,
            userId,
            createdAt: new Date(c.createdAt as string),
            updatedAt: new Date(c.updatedAt as string),
          } as Category
          if (cloudReady) {
            syncQueueCategories.push({
              tempId: newId,
              data: { ...category, id: newId },
            })
          }
          return category
        })
        await localCache.categories.putAll(categoriesToImport)
      }

      // Import loans with new IDs
      if (data.loans?.length) {
        const loansToImport = data.loans.map((l: Record<string, unknown>) => {
          const oldId = l.id as number | undefined
          const newId = generateTempId()
          if (oldId !== undefined) {
            loanIdMap.set(oldId, newId)
          }
          const loan = {
            ...l,
            id: newId as unknown as number,
            userId,
            accountId: l.accountId
              ? (accountIdMap.get(l.accountId as number) as unknown as number)
              : undefined,
            dueDate: l.dueDate ? new Date(l.dueDate as string) : undefined,
            createdAt: new Date(l.createdAt as string),
            updatedAt: new Date(l.updatedAt as string),
          } as Loan
          if (cloudReady) {
            syncQueueLoans.push({
              tempId: newId,
              data: { ...loan, id: newId },
            })
          }
          return loan
        })
        await localCache.loans.putAll(loansToImport)
      }

      // Import transactions with new IDs and updated references
      if (data.transactions?.length) {
        const transactionsToImport = data.transactions.map((t: Record<string, unknown>) => {
          const newId = generateTempId()
          const transaction = {
            ...t,
            id: newId as unknown as number,
            userId,
            accountId: t.accountId
              ? (accountIdMap.get(t.accountId as number) as unknown as number)
              : undefined,
            toAccountId: t.toAccountId
              ? (accountIdMap.get(t.toAccountId as number) as unknown as number)
              : undefined,
            categoryId: t.categoryId
              ? (categoryIdMap.get(t.categoryId as number) as unknown as number)
              : undefined,
            incomeSourceId: t.incomeSourceId
              ? (incomeSourceIdMap.get(t.incomeSourceId as number) as unknown as number)
              : undefined,
            loanId: t.loanId ? (loanIdMap.get(t.loanId as number) as unknown as number) : undefined,
            date: new Date(t.date as string),
            createdAt: new Date(t.createdAt as string),
            updatedAt: new Date(t.updatedAt as string),
          } as Transaction
          if (cloudReady) {
            syncQueueTransactions.push({
              tempId: newId,
              data: { ...transaction, id: newId },
            })
          }
          return transaction
        })
        await localCache.transactions.putAll(transactionsToImport)
      }

      // Queue all imported data for sync
      if (cloudReady) {
        await syncService.queueBulkOperation('create', 'accounts', syncQueueAccounts)
        await syncService.queueBulkOperation('create', 'incomeSources', syncQueueIncomeSources)
        await syncService.queueBulkOperation('create', 'categories', syncQueueCategories)
        await syncService.queueBulkOperation('create', 'loans', syncQueueLoans)
        await syncService.queueBulkOperation('create', 'transactions', syncQueueTransactions)
      }

      // Directly set query data from database to ensure UI updates
      const [accounts, incomeSources, categories, transactions, loans, currencies] =
        await Promise.all([
          accountRepo.getAll(),
          incomeSourceRepo.getAll(),
          categoryRepo.getAll(),
          transactionRepo.getAll(),
          loanRepo.getAll(),
          customCurrencyRepo.getAll(),
        ])

      queryClient.setQueryData(['accounts'], accounts)
      queryClient.setQueryData(['incomeSources'], incomeSources)
      queryClient.setQueryData(['categories'], categories)
      queryClient.setQueryData(['transactions'], transactions)
      queryClient.setQueryData(['loans'], loans)
      queryClient.setQueryData(['customCurrencies'], currencies)

      setImportSuccess(true)
    } catch (error) {
      console.error('Import failed:', error)
      setImportError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleOpenDeleteModal = () => {
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)

    try {
      await localCache.clearAll()

      // Delete from Supabase cloud only if sync is enabled
      if (isCloudReady()) {
        await supabaseApi.accounts.deleteAll()
        await supabaseApi.incomeSources.deleteAll()
        await supabaseApi.categories.deleteAll()
        await supabaseApi.transactions.deleteAll()
        await supabaseApi.loans.deleteAll()
        await supabaseApi.customCurrencies.deleteAll()
      }

      // Invalidate queries to refresh UI
      await queryClient.invalidateQueries()

      setDeleteModalOpen(false)
    } catch (error) {
      console.error('Failed to clear data:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAccount = async (account: Account) => {
    if (!account.id) return
    if (!confirm(`Delete "${account.name}"?`)) return
    await accountRepo.delete(account.id)
    await queryClient.invalidateQueries({ queryKey: ['accounts'], refetchType: 'all' })
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!category.id) return
    if (!confirm(`Delete "${category.name}"?`)) return
    await categoryRepo.delete(category.id)
    await queryClient.invalidateQueries({ queryKey: ['categories'], refetchType: 'all' })
  }

  const handleDeleteIncomeSource = async (source: IncomeSource) => {
    if (!source.id) return
    if (!confirm(`Delete "${source.name}"?`)) return
    await incomeSourceRepo.delete(source.id)
    await queryClient.invalidateQueries({ queryKey: ['incomeSources'], refetchType: 'all' })
  }

  const handleDeleteCurrency = async (currency: CustomCurrency) => {
    if (!currency.id) return
    if (!confirm(`Delete "${currency.name}" (${currency.code})?`)) return
    await customCurrencyRepo.delete(currency.id)
    await queryClient.invalidateQueries({ queryKey: ['customCurrencies'], refetchType: 'all' })
  }

  // Render management sections
  if (activeSection === 'accounts') {
    return (
      <ManagementView
        title={t('manageAccounts')}
        onBack={() => setActiveSection(null)}
        onAdd={() => {
          setEditingAccount(null)
          setAccountFormOpen(true)
        }}
        backLabel={t('back')}
      >
        <DndContext
          sensors={reorderSensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) =>
            handleReorder(e, accounts, accountRepo, () =>
              queryClient.invalidateQueries({ queryKey: ['accounts'], refetchType: 'all' })
            )
          }
        >
          <SortableContext
            items={accounts.map((a) => a.id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {accounts.map((account) => (
                <SortableManagementItem
                  key={account.id}
                  id={account.id!}
                  color={account.color}
                  title={account.name}
                  subtitle={
                    <BlurredAmount>
                      {formatCurrency(account.balance, account.currency)}
                    </BlurredAmount>
                  }
                  onEdit={() => {
                    setEditingAccount(account)
                    setAccountFormOpen(true)
                  }}
                  onDelete={() => handleDeleteAccount(account)}
                />
              ))}
              {accounts.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">{t('noAccountsYet')}</p>
              )}
            </div>
          </SortableContext>
        </DndContext>
        <AccountForm
          account={editingAccount}
          open={accountFormOpen}
          onClose={() => setAccountFormOpen(false)}
        />
      </ManagementView>
    )
  }

  if (activeSection === 'categories') {
    return (
      <ManagementView
        title={t('manageCategories')}
        onBack={() => setActiveSection(null)}
        onAdd={() => {
          setEditingCategory(null)
          setCategoryFormOpen(true)
        }}
        backLabel={t('back')}
      >
        <DndContext
          sensors={reorderSensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) =>
            handleReorder(e, categories, categoryRepo, () =>
              queryClient.invalidateQueries({ queryKey: ['categories'], refetchType: 'all' })
            )
          }
        >
          <SortableContext
            items={categories.map((c) => c.id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {categories.map((category) => (
                <SortableManagementItem
                  key={category.id}
                  id={category.id!}
                  color={category.color}
                  title={category.name}
                  subtitle={
                    category.budget ? (
                      <>
                        <span>{t('budget')}: </span>
                        <BlurredAmount>
                          {formatCurrency(category.budget, mainCurrency)}
                        </BlurredAmount>
                      </>
                    ) : undefined
                  }
                  onEdit={() => {
                    setEditingCategory(category)
                    setCategoryFormOpen(true)
                  }}
                  onDelete={() => handleDeleteCategory(category)}
                />
              ))}
              {categories.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">{t('noExpenseCategories')}</p>
              )}
            </div>
          </SortableContext>
        </DndContext>
        <CategoryForm
          category={editingCategory}
          open={categoryFormOpen}
          onClose={() => setCategoryFormOpen(false)}
        />
      </ManagementView>
    )
  }

  if (activeSection === 'income') {
    return (
      <ManagementView
        title={t('manageIncomeSources')}
        onBack={() => setActiveSection(null)}
        onAdd={() => {
          setEditingIncome(null)
          setIncomeFormOpen(true)
        }}
        backLabel={t('back')}
      >
        <DndContext
          sensors={reorderSensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) =>
            handleReorder(e, incomeSources, incomeSourceRepo, () =>
              queryClient.invalidateQueries({ queryKey: ['incomeSources'], refetchType: 'all' })
            )
          }
        >
          <SortableContext
            items={incomeSources.map((s) => s.id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {incomeSources.map((source) => (
                <SortableManagementItem
                  key={source.id}
                  id={source.id!}
                  color={source.color}
                  title={source.name}
                  onEdit={() => {
                    setEditingIncome(source)
                    setIncomeFormOpen(true)
                  }}
                  onDelete={() => handleDeleteIncomeSource(source)}
                />
              ))}
              {incomeSources.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">{t('noIncomeSources')}</p>
              )}
            </div>
          </SortableContext>
        </DndContext>
        <IncomeSourceForm
          source={editingIncome}
          open={incomeFormOpen}
          onClose={() => setIncomeFormOpen(false)}
        />
      </ManagementView>
    )
  }

  if (activeSection === 'currencies') {
    return (
      <ManagementView
        title={t('manageCurrencies')}
        onBack={() => setActiveSection(null)}
        onAdd={() => {
          setEditingCurrency(null)
          setCurrencyFormOpen(true)
        }}
        backLabel={t('back')}
      >
        <div className="space-y-2">
          {customCurrencies.map((currency) => (
            <ManagementItem
              key={currency.id}
              color="#6366f1"
              title={`${currency.symbol} ${currency.code}`}
              subtitle={currency.name}
              onEdit={() => {
                setEditingCurrency(currency)
                setCurrencyFormOpen(true)
              }}
              onDelete={() => handleDeleteCurrency(currency)}
            />
          ))}
          {customCurrencies.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">{t('noCustomCurrencies')}</p>
          )}
        </div>
        <CurrencyForm
          currency={editingCurrency}
          open={currencyFormOpen}
          onClose={() => setCurrencyFormOpen(false)}
        />
      </ManagementView>
    )
  }

  // Main settings view
  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-4 py-3">
        <h1 className="text-xl font-bold">{t('settings')}</h1>
      </div>

      {/* Update Card */}
      {needRefresh && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-xl">
            <RefreshCw className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{t('updateAvailable')}</p>
              <p className="text-xs text-muted-foreground">{t('updateDescription')}</p>
            </div>
            <Button size="sm" onClick={updateServiceWorker}>
              {t('updateNow')}
            </Button>
          </div>
        </div>
      )}

      {/* Management Sections */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('manage')}
        </h3>
        <div className="space-y-2">
          <SettingsRow
            icon={DollarSign}
            label={t('incomeSources')}
            count={incomeSources.length}
            onClick={() => setActiveSection('income')}
          />
          <SettingsRow
            icon={Wallet}
            label={t('accounts')}
            count={accounts.length}
            onClick={() => setActiveSection('accounts')}
          />
          <SettingsRow
            icon={Tags}
            label={t('categories')}
            count={categories.length}
            onClick={() => setActiveSection('categories')}
          />
          <SettingsRow
            icon={Coins}
            label={t('currencies')}
            count={customCurrencies.length}
            onClick={() => setActiveSection('currencies')}
          />
        </div>
      </div>

      {/* Language & Currency Section */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('language')}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="text-[17px]">{t('language')}</span>
            </div>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>{language === 'en' ? t('english') : t('russian')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('english')}</SelectItem>
                <SelectItem value="ru">{t('russian')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-[17px] block">{t('mainCurrency')}</span>
                <span className="text-sm text-muted-foreground">
                  {t('mainCurrencyDescription')}
                </span>
              </div>
            </div>
            <Select value={mainCurrency} onValueChange={(v) => setMainCurrency(v)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue>
                  {getAllCurrencies().find((c) => c.code === mainCurrency)?.symbol} {mainCurrency}
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
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3">
              <EyeOff className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-[17px] block">{t('privacyMode')}</span>
                <span className="text-sm text-muted-foreground">{t('privacyModeDescription')}</span>
              </div>
            </div>
            <button
              onClick={() => setBlurFinancialFigures(!blurFinancialFigures)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                blurFinancialFigures ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  blurFinancialFigures ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Sync Section */}
      {cloudUnlocked && migrationComplete && (
        <div className="px-4 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t('syncStatus')}
          </h3>

          <div className="space-y-2">
            {/* Sync Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                {isOffline ? (
                  <WifiOff className="h-5 w-5 text-amber-500 shrink-0" />
                ) : status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                ) : status === 'syncing' ? (
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                ) : pendingCount > 0 ? (
                  <RefreshCw className="h-5 w-5 text-amber-500 shrink-0" />
                ) : (
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-[17px] block">
                    {isOffline
                      ? t('syncOffline')
                      : status === 'syncing'
                        ? t('syncing')
                        : status === 'error'
                          ? t('syncError')
                          : pendingCount > 0
                            ? t('syncPending').replace('{count}', String(pendingCount))
                            : t('syncComplete')}
                  </span>
                  {pendingCount > 0 && !isOffline && status !== 'syncing' && status !== 'error' && (
                    <p className="text-sm text-muted-foreground">
                      {pendingCount}{' '}
                      {t(pendingCount === 1 ? 'itemsWaiting' : 'itemsWaiting_plural')}
                    </p>
                  )}
                  {nextRetryAt && !isOffline && status !== 'syncing' && (
                    <p className="text-sm text-muted-foreground">
                      {t('nextRetryIn').replace('{time}', formatTimeUntil(nextRetryAt))}
                    </p>
                  )}
                  {isOffline && (
                    <p className="text-sm text-muted-foreground">{t('offlineDescription')}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => sync()}
                disabled={isOffline || status === 'syncing'}
                variant="outline"
                className="shrink-0"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1.5 ${status === 'syncing' ? 'animate-spin' : ''}`}
                />
                {t('syncNow')}
              </Button>
            </div>

            {/* User ID */}
            <button
              className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl active:bg-secondary transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(getUserId())
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Key className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="text-left min-w-0">
                  <span className="text-[17px] block">User ID</span>
                  <span className="text-sm text-muted-foreground font-mono block max-w-[180px] sm:max-w-[220px] truncate">
                    {getUserId()}
                  </span>
                </div>
              </div>
              <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Data Section */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('data')}
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => setImportWizardOpen(true)}
            className={`w-full flex items-center justify-between p-4 rounded-xl ${
              savedImportState ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet
                className={`h-5 w-5 ${savedImportState ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <div className="text-left">
                <span
                  className={`text-[17px] ${savedImportState ? 'text-primary font-medium' : ''}`}
                >
                  {savedImportState ? t('importResume') : t('importFromBudgetOk')}
                </span>
                {savedImportState && (
                  <span className="text-sm text-muted-foreground block">
                    {savedImportState.fileName}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight
              className={`h-5 w-5 ${savedImportState ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </button>

          <button
            onClick={() => setExportDialogOpen(true)}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-muted-foreground" />
              <span className="text-[17px]">{t('exportBackup')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <label className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl cursor-pointer">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-[17px]">{t('importBackup')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFileSelected}
              disabled={isImporting}
              className="hidden"
            />
          </label>

          {importError && (
            <div className="p-3 bg-destructive/20 text-destructive rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {importError}
            </div>
          )}
          {importSuccess && (
            <div className="p-3 bg-success/20 text-success rounded-xl">
              {t('dataImportedSuccessfully')}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-destructive uppercase tracking-wide mb-3">
          {t('dangerZone')}
        </h3>
        <button
          onClick={handleOpenDeleteModal}
          className="w-full flex items-center justify-between p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5" />
            <span>{t('deleteAllData')}</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        <button
          type="button"
          onClick={handleVersionClick}
          className={`text-inherit ${cloudUnlocked && migrationComplete ? 'text-primary' : ''}`}
        >
          Finance Tracker v{version}
        </button>
        <p>
          {isSupabaseConfigured() && cloudUnlocked && migrationComplete
            ? t('dataStoredInCloud')
            : t('dataStoredLocally')}
        </p>
      </div>

      {/* Export Confirmation Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(open) => !open && setExportDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exportConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{t('exportConfirmMessage')}</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleExportJSON} disabled={isExporting} className="w-full sm:w-auto">
              {isExporting ? t('processing') : t('exportBackup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => !open && setImportDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('backupImportConfirmTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{t('backupImportConfirmMessage')}</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="w-full sm:w-auto"
            >
              {isImporting ? t('processing') : t('importBackup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && setDeleteModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('deleteAllData')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{t('deleteConfirmationMessage')}</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="w-full sm:w-auto"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? t('processing') : t('deleteAllData')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BudgetOk Import Wizard */}
      <BudgetOkImportWizard
        open={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        onPause={() => setImportWizardOpen(false)}
        savedState={savedImportState}
        onStateChange={setSavedImportState}
      />
    </div>
  )
}

// Helper components
function SettingsRow({
  icon: Icon,
  label,
  count,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl touch-target"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-[17px]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && <span className="text-sm text-muted-foreground">{count}</span>}
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </button>
  )
}

function ManagementView({
  title,
  onBack,
  onAdd,
  backLabel = 'Back',
  children,
}: {
  title: string
  onBack: () => void
  onAdd: () => void
  backLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="text-primary font-medium" aria-label="Back">
          {backLabel}
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
        <button
          onClick={onAdd}
          className="p-2 rounded-full bg-primary text-primary-foreground"
          aria-label="Add"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 px-4 pb-4">{children}</div>
    </div>
  )
}

function SortableManagementItem({
  id,
  color,
  title,
  subtitle,
  onEdit,
  onDelete,
}: {
  id: number
  color: string
  title: string
  subtitle?: React.ReactNode
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl"
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 touch-none cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div
        className="w-10 h-10 rounded-full flex-shrink-0"
        style={{ backgroundColor: color + '30' }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{ backgroundColor: color + '40' }}
        >
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-2 rounded-full hover:bg-secondary touch-target"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-full hover:bg-destructive/20 touch-target"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  )
}

function ManagementItem({
  color,
  title,
  subtitle,
  onEdit,
  onDelete,
}: {
  color: string
  title: string
  subtitle?: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
      <div
        className="w-10 h-10 rounded-full flex-shrink-0"
        style={{ backgroundColor: color + '30' }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{ backgroundColor: color + '40' }}
        >
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-2 rounded-full hover:bg-secondary touch-target"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-full hover:bg-destructive/20 touch-target"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  )
}
