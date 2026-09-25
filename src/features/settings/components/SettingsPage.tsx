import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  DragEndEvent,
  DraggableAttributes,
  DraggableSyntheticListeners,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core'
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
  Coins,
  Globe,
  GripVertical,
  EyeOff,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

import { version } from '../../../../package.json'

import { CurrencyForm } from './CurrencyForm'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { CurrencySelect } from '@/components/ui/CurrencySelect'
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
import { db, restoreTable } from '@/database/db'
import {
  accountRepo,
  categoryRepo,
  incomeSourceRepo,
  customCurrencyRepo,
} from '@/database/repositories'
import type { Account, Category, IncomeSource, CustomCurrency } from '@/database/types'
import { AccountForm } from '@/features/accounts/components/AccountForm'
import { CategoryForm } from '@/features/categories/components/CategoryForm'
import {
  BudgetOkImportWizard,
  type SavedImportState,
} from '@/features/import/components/BudgetOkImportWizard'
import { IncomeSourceForm } from '@/features/income/components/IncomeSourceForm'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { buildBackupData, parseBackupData } from '@/utils/backup'
import { buildTransactionsCsv, CSV_FORMATS } from '@/utils/csvExport'
import { formatCurrency } from '@/utils/currency'
import type { Language } from '@/utils/i18n'

const todayIso = () => new Date().toISOString().split('T')[0]

function downloadFile(content: string, type: string, fileName: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

type ManagementSection = 'accounts' | 'categories' | 'income' | 'currencies' | undefined

export function SettingsPage() {
  const {
    accounts,
    incomeSources,
    categories,
    transactions,
    loans,
    customCurrencies,
    appVisits,
    mainCurrency,
    setMainCurrency,
    blurFinancialFigures,
    setBlurFinancialFigures,
    loadAllData,
    refreshAccounts,
    refreshCategories,
    refreshIncomeSources,
    refreshCustomCurrencies,
  } = useAppStore()
  const { language, setLanguage, t } = useLanguage()
  const { needRefresh, updateServiceWorker } = useServiceWorker()

  const [activeSection, setActiveSection] = useState<ManagementSection>()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [accountFormOpen, setAccountFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account>()
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category>()
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeSource>()
  const [currencyFormOpen, setCurrencyFormOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<CustomCurrency>()
  const [importWizardOpen, setImportWizardOpen] = useState(false)
  const [savedImportState, setSavedImportState] = useState<SavedImportState>()

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
    setIsExporting(true)
    try {
      const data = buildBackupData({
        accounts,
        incomeSources,
        categories,
        transactions,
        loans,
        customCurrencies,
        appVisits,
      })
      downloadFile(
        JSON.stringify(data, undefined, 2),
        'application/json',
        `finance-tracker-backup-${todayIso()}.json`
      )
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = () => {
    setIsExporting(true)
    try {
      const csv = buildTransactionsCsv(
        { transactions, accounts, categories, incomeSources, loans, mainCurrency },
        {
          columns: {
            date: t('csvDate'),
            type: t('csvType'),
            amount: t('csvAmount'),
            currency: t('csvCurrency'),
            account: t('csvAccount'),
            accountAmount: t('csvAccountAmount'),
            accountCurrency: t('csvAccountCurrency'),
            categoryOrSource: t('csvCategoryOrSource'),
            toAccount: t('csvToAccount'),
            toAmount: t('csvToAmount'),
            toAccountCurrency: t('csvToAccountCurrency'),
            mainCurrencyAmount: t('csvMainCurrencyAmount'),
            loanPerson: t('csvLoanPerson'),
            comment: t('csvComment'),
          },
          types: {
            income: t('csvTypeIncome'),
            expense: t('csvTypeExpense'),
            transfer: t('csvTypeTransfer'),
            loan_given: t('csvTypeLoanGiven'),
            loan_received: t('csvTypeLoanReceived'),
            loan_payment: t('csvTypeLoanPayment'),
          },
        },
        CSV_FORMATS[language]
      )
      downloadFile(csv, 'text/csv;charset=utf-8', `finance-tracker-transactions-${todayIso()}.csv`)
    } catch (error) {
      console.error('CSV export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError('')
    setImportSuccess(false)

    try {
      const text = await file.text()
      const data = parseBackupData(JSON.parse(text))

      await db.transaction(
        'rw',
        [
          db.accounts,
          db.incomeSources,
          db.categories,
          db.transactions,
          db.loans,
          db.customCurrencies,
          db.appVisits,
        ],
        async () => {
          await db.accounts.clear()
          await db.incomeSources.clear()
          await db.categories.clear()
          await db.transactions.clear()
          await db.loans.clear()
          await db.customCurrencies.clear()
          await db.appVisits.clear()

          // IDs from the backup are preserved (not regenerated) so that
          // foreign keys like transaction.accountId / categoryId /
          // incomeSourceId / loanId and loan.accountId keep pointing at the
          // right records. Tables are cleared above, so reusing the
          // original IDs is safe.
          await restoreTable(db.accounts, data.accounts)
          await restoreTable(db.incomeSources, data.incomeSources)
          await restoreTable(db.categories, data.categories)
          await restoreTable(db.transactions, data.transactions)
          await restoreTable(db.loans, data.loans)
          await restoreTable(db.customCurrencies, data.customCurrencies)
          await restoreTable(db.appVisits, data.appVisits)
        }
      )

      await loadAllData()
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
      await db.transaction(
        'rw',
        [db.accounts, db.incomeSources, db.categories, db.transactions, db.loans],
        async () => {
          await db.accounts.clear()
          await db.incomeSources.clear()
          await db.categories.clear()
          await db.transactions.clear()
          await db.loans.clear()
        }
      )
      await loadAllData()
      setDeleteModalOpen(false)
    } catch (error) {
      console.error('Failed to clear data:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteEntity = async (
    label: string,
    id: number | undefined,
    deleteFn: (id: number) => Promise<unknown>,
    refresh: () => Promise<void>
  ) => {
    if (!id) return
    if (!confirm(t('deleteItemConfirm').replace('%s', label))) return
    await deleteFn(id)
    await refresh()
  }

  // Render management sections
  if (activeSection === 'accounts') {
    return (
      <ManagementView
        title={t('manageAccounts')}
        onBack={() => setActiveSection(undefined)}
        onAdd={() => {
          setEditingAccount(undefined)
          setAccountFormOpen(true)
        }}
        backLabel={t('back')}
      >
        <SortableManagementSection
          items={accounts}
          sensors={reorderSensors}
          onDragEnd={(e) => handleReorder(e, accounts, accountRepo, refreshAccounts)}
          getColor={(account) => account.color}
          getTitle={(account) => account.name}
          getSubtitle={(account) => (
            <BlurredAmount>{formatCurrency(account.balance, account.currency)}</BlurredAmount>
          )}
          onEdit={(account) => {
            setEditingAccount(account)
            setAccountFormOpen(true)
          }}
          onDelete={(account) =>
            handleDeleteEntity(account.name, account.id, accountRepo.delete, refreshAccounts)
          }
          emptyMessage={t('noAccountsYet')}
        />
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
        onBack={() => setActiveSection(undefined)}
        onAdd={() => {
          setEditingCategory(undefined)
          setCategoryFormOpen(true)
        }}
        backLabel={t('back')}
      >
        <SortableManagementSection
          items={categories}
          sensors={reorderSensors}
          onDragEnd={(e) => handleReorder(e, categories, categoryRepo, refreshCategories)}
          getColor={(category) => category.color}
          getTitle={(category) => category.name}
          onEdit={(category) => {
            setEditingCategory(category)
            setCategoryFormOpen(true)
          }}
          onDelete={(category) =>
            handleDeleteEntity(category.name, category.id, categoryRepo.delete, refreshCategories)
          }
          emptyMessage={t('noExpenseCategories')}
        />
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
        onBack={() => setActiveSection(undefined)}
        onAdd={() => {
          setEditingIncome(undefined)
          setIncomeFormOpen(true)
        }}
        backLabel={t('back')}
      >
        <SortableManagementSection
          items={incomeSources}
          sensors={reorderSensors}
          onDragEnd={(e) => handleReorder(e, incomeSources, incomeSourceRepo, refreshIncomeSources)}
          getColor={(source) => source.color}
          getTitle={(source) => source.name}
          onEdit={(source) => {
            setEditingIncome(source)
            setIncomeFormOpen(true)
          }}
          onDelete={(source) =>
            handleDeleteEntity(
              source.name,
              source.id,
              incomeSourceRepo.delete,
              refreshIncomeSources
            )
          }
          emptyMessage={t('noIncomeSources')}
        />
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
        onBack={() => setActiveSection(undefined)}
        onAdd={() => {
          setEditingCurrency(undefined)
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
              onDelete={() =>
                handleDeleteEntity(
                  `${currency.name} (${currency.code})`,
                  currency.id,
                  customCurrencyRepo.delete,
                  refreshCustomCurrencies
                )
              }
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
        <h1 className="text-page-title">{t('settings')}</h1>
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
      <div className="px-4 py-2">
        <h3 className="text-section-label mb-3">{t('manage')}</h3>
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
        <h3 className="text-section-label mb-3">{t('language')}</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span>{t('language')}</span>
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
                <span>{t('mainCurrency')}</span>
                <p className="text-xs text-muted-foreground">{t('mainCurrencyDescription')}</p>
              </div>
            </div>
            <CurrencySelect
              value={mainCurrency}
              onValueChange={setMainCurrency}
              triggerClassName="w-[100px]"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3">
              <EyeOff className="h-5 w-5 text-muted-foreground" />
              <div>
                <span>{t('privacyMode')}</span>
                <p className="text-xs text-muted-foreground">{t('privacyModeDescription')}</p>
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

      {/* Data Section */}
      <div className="px-4 py-4">
        <h3 className="text-section-label mb-3">{t('data')}</h3>
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
                <span className={savedImportState ? 'text-primary font-medium' : ''}>
                  {savedImportState ? t('importResume') : t('importFromBudgetOk')}
                </span>
                {savedImportState && (
                  <p className="text-xs text-muted-foreground">{savedImportState.fileName}</p>
                )}
              </div>
            </div>
            <ChevronRight
              className={`h-5 w-5 ${savedImportState ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </button>

          <button
            onClick={handleExportJSON}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-muted-foreground" />
              <span>{t('exportBackup')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span>{t('exportCsv')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <label className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl cursor-pointer">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span>{t('importBackup')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
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
        <p>Finance Tracker v{version}</p>
        <p>{t('dataStoredLocally')}</p>
      </div>

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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
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
        <span>{label}</span>
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
        <h1 className="text-page-title">{title}</h1>
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

interface ManagementItemProps {
  color: string
  title: string
  subtitle?: React.ReactNode
  onEdit: () => void
  onDelete: () => void
  dragHandle?: {
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners
  }
  containerRef?: (node: HTMLElement | null) => void
  containerStyle?: React.CSSProperties
}

function ManagementItem({
  color,
  title,
  subtitle,
  onEdit,
  onDelete,
  dragHandle,
  containerRef,
  containerStyle,
}: ManagementItemProps) {
  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl"
    >
      {dragHandle && (
        <button
          {...dragHandle.attributes}
          {...dragHandle.listeners}
          className="p-1 touch-none cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
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

function SortableManagementItem({
  id,
  ...itemProps
}: { id: number } & Omit<ManagementItemProps, 'dragHandle' | 'containerRef' | 'containerStyle'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ManagementItem
      {...itemProps}
      dragHandle={{ attributes, listeners }}
      containerRef={setNodeRef}
      containerStyle={style}
    />
  )
}

interface SortableManagementSectionProps<T extends { id?: number }> {
  items: T[]
  sensors: SensorDescriptor<SensorOptions>[]
  onDragEnd: (event: DragEndEvent) => void
  getColor: (item: T) => string
  getTitle: (item: T) => string
  getSubtitle?: (item: T) => React.ReactNode
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  emptyMessage: string
}

/**
 * The DndContext/SortableContext/map/empty-state pattern shared by the
 * accounts, categories, and income-sources management sections.
 */
function SortableManagementSection<T extends { id?: number }>({
  items,
  sensors,
  onDragEnd,
  getColor,
  getTitle,
  getSubtitle,
  onEdit,
  onDelete,
  emptyMessage,
}: SortableManagementSectionProps<T>) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id!)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <SortableManagementItem
              key={item.id}
              id={item.id!}
              color={getColor(item)}
              title={getTitle(item)}
              subtitle={getSubtitle?.(item)}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
          {items.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
