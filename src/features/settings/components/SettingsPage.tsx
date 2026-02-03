import { useState, useRef, useCallback } from 'react'
import { version } from '../../../../package.json'
import {
  Wallet, Tags, DollarSign, Download, Upload, Trash2, ChevronRight,
  Plus, Pencil, AlertTriangle, Coins, Globe, GripVertical
} from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { db } from '@/database/db'
import { accountRepo, categoryRepo, incomeSourceRepo, customCurrencyRepo } from '@/database/repositories'
import { formatCurrency, getAllCurrencies } from '@/utils/currency'
import { AccountForm } from '@/features/accounts/components/AccountForm'
import { CategoryForm } from '@/features/categories/components/CategoryForm'
import { IncomeSourceForm } from '@/features/income/components/IncomeSourceForm'
import { CurrencyForm } from './CurrencyForm'
import type { Account, Category, IncomeSource, CustomCurrency } from '@/database/types'
import type { Language } from '@/utils/i18n'

type ManagementSection = 'accounts' | 'categories' | 'income' | 'currencies' | null

export function SettingsPage() {
  const {
    accounts, incomeSources, categories, transactions, investments, loans, customCurrencies,
    mainCurrency, setMainCurrency,
    loadAllData, refreshAccounts, refreshCategories, refreshIncomeSources, refreshCustomCurrencies
  } = useAppStore()
  const { language, setLanguage, t } = useLanguage()

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

  // Drag-to-reorder sensors
  const reorderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleReorder = useCallback(async (
    event: DragEndEvent,
    items: { id?: number }[],
    repo: { update: (id: number, updates: Record<string, unknown>) => Promise<unknown> },
    refresh: () => Promise<void>,
  ) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Reorder array
    const reordered = [...items]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    // Update sortOrder for all items
    await Promise.all(reordered.map((item, index) =>
      item.id ? repo.update(item.id, { sortOrder: index }) : Promise.resolve()
    ))
    await refresh()
  }, [])

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExportJSON = async () => {
    setIsExporting(true)
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        accounts, incomeSources, categories, transactions, investments, loans,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
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
      const data = JSON.parse(text)

      if (!data.version || !data.accounts || !data.transactions) {
        throw new Error('Invalid backup file format')
      }

      await db.transaction('rw', [db.accounts, db.incomeSources, db.categories, db.transactions, db.investments, db.loans], async () => {
        await db.accounts.clear()
        await db.incomeSources.clear()
        await db.categories.clear()
        await db.transactions.clear()
        await db.investments.clear()
        await db.loans.clear()

        if (data.accounts?.length) {
          await db.accounts.bulkAdd(data.accounts.map((a: Record<string, unknown>) => ({
            ...a, id: undefined,
            createdAt: new Date(a.createdAt as string),
            updatedAt: new Date(a.updatedAt as string),
          })))
        }
        if (data.incomeSources?.length) {
          await db.incomeSources.bulkAdd(data.incomeSources.map((s: Record<string, unknown>) => ({
            ...s, id: undefined,
            createdAt: new Date(s.createdAt as string),
            updatedAt: new Date(s.updatedAt as string),
          })))
        }
        if (data.categories?.length) {
          await db.categories.bulkAdd(data.categories.map((c: Record<string, unknown>) => ({
            ...c, id: undefined,
            createdAt: new Date(c.createdAt as string),
            updatedAt: new Date(c.updatedAt as string),
          })))
        }
        if (data.transactions?.length) {
          await db.transactions.bulkAdd(data.transactions.map((t: Record<string, unknown>) => ({
            ...t, id: undefined,
            date: new Date(t.date as string),
            createdAt: new Date(t.createdAt as string),
            updatedAt: new Date(t.updatedAt as string),
          })))
        }
        if (data.investments?.length) {
          await db.investments.bulkAdd(data.investments.map((i: Record<string, unknown>) => ({
            ...i, id: undefined,
            lastPriceUpdate: i.lastPriceUpdate ? new Date(i.lastPriceUpdate as string) : undefined,
            createdAt: new Date(i.createdAt as string),
            updatedAt: new Date(i.updatedAt as string),
          })))
        }
        if (data.loans?.length) {
          await db.loans.bulkAdd(data.loans.map((l: Record<string, unknown>) => ({
            ...l, id: undefined,
            dueDate: l.dueDate ? new Date(l.dueDate as string) : undefined,
            createdAt: new Date(l.createdAt as string),
            updatedAt: new Date(l.updatedAt as string),
          })))
        }
      })

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
      await db.transaction('rw', [db.accounts, db.incomeSources, db.categories, db.transactions, db.investments, db.loans], async () => {
        await db.accounts.clear()
        await db.incomeSources.clear()
        await db.categories.clear()
        await db.transactions.clear()
        await db.investments.clear()
        await db.loans.clear()
      })
      await loadAllData()
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
    await refreshAccounts()
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!category.id) return
    if (!confirm(`Delete "${category.name}"?`)) return
    await categoryRepo.delete(category.id)
    await refreshCategories()
  }

  const handleDeleteIncomeSource = async (source: IncomeSource) => {
    if (!source.id) return
    if (!confirm(`Delete "${source.name}"?`)) return
    await incomeSourceRepo.delete(source.id)
    await refreshIncomeSources()
  }

  const handleDeleteCurrency = async (currency: CustomCurrency) => {
    if (!currency.id) return
    if (!confirm(`Delete "${currency.name}" (${currency.code})?`)) return
    await customCurrencyRepo.delete(currency.id)
    await refreshCustomCurrencies()
  }

  // Render management sections
  if (activeSection === 'accounts') {
    return (
      <ManagementView
        title={t('manageAccounts')}
        onBack={() => setActiveSection(null)}
        onAdd={() => { setEditingAccount(null); setAccountFormOpen(true) }}
        backLabel={t('back')}
      >
        <DndContext sensors={reorderSensors} collisionDetection={closestCenter} onDragEnd={(e) => handleReorder(e, accounts, accountRepo, refreshAccounts)}>
          <SortableContext items={accounts.map(a => a.id!)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {accounts.map((account) => (
                <SortableManagementItem
                  key={account.id}
                  id={account.id!}
                  color={account.color}
                  title={account.name}
                  subtitle={formatCurrency(account.balance, account.currency)}
                  onEdit={() => { setEditingAccount(account); setAccountFormOpen(true) }}
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
        onAdd={() => { setEditingCategory(null); setCategoryFormOpen(true) }}
        backLabel={t('back')}
      >
        <DndContext sensors={reorderSensors} collisionDetection={closestCenter} onDragEnd={(e) => handleReorder(e, categories, categoryRepo, refreshCategories)}>
          <SortableContext items={categories.map(c => c.id!)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {categories.map((category) => (
                <SortableManagementItem
                  key={category.id}
                  id={category.id!}
                  color={category.color}
                  title={category.name}
                  subtitle={category.budget ? `${t('budget')}: ${formatCurrency(category.budget, mainCurrency)}` : undefined}
                  onEdit={() => { setEditingCategory(category); setCategoryFormOpen(true) }}
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
        onAdd={() => { setEditingIncome(null); setIncomeFormOpen(true) }}
        backLabel={t('back')}
      >
        <DndContext sensors={reorderSensors} collisionDetection={closestCenter} onDragEnd={(e) => handleReorder(e, incomeSources, incomeSourceRepo, refreshIncomeSources)}>
          <SortableContext items={incomeSources.map(s => s.id!)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {incomeSources.map((source) => (
                <SortableManagementItem
                  key={source.id}
                  id={source.id!}
                  color={source.color}
                  title={source.name}
                  onEdit={() => { setEditingIncome(source); setIncomeFormOpen(true) }}
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
        onAdd={() => { setEditingCurrency(null); setCurrencyFormOpen(true) }}
        backLabel={t('back')}
      >
        <div className="space-y-2">
          {customCurrencies.map((currency) => (
            <ManagementItem
              key={currency.id}
              color="#6366f1"
              title={`${currency.symbol} ${currency.code}`}
              subtitle={currency.name}
              onEdit={() => { setEditingCurrency(currency); setCurrencyFormOpen(true) }}
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

      {/* Management Sections */}
      <div className="px-4 py-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('manage')}
        </h3>
        <div className="space-y-2">
          <SettingsRow icon={DollarSign} label={t('incomeSources')} count={incomeSources.length} onClick={() => setActiveSection('income')} />
          <SettingsRow icon={Wallet} label={t('accounts')} count={accounts.length} onClick={() => setActiveSection('accounts')} />
          <SettingsRow icon={Tags} label={t('categories')} count={categories.length} onClick={() => setActiveSection('categories')} />
          <SettingsRow icon={Coins} label={t('currencies')} count={customCurrencies.length} onClick={() => setActiveSection('currencies')} />
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
              <span>{t('language')}</span>
            </div>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  {language === 'en' ? t('english') : t('russian')}
                </SelectValue>
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
            <Select value={mainCurrency} onValueChange={(v) => setMainCurrency(v)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue>
                  {getAllCurrencies().find(c => c.code === mainCurrency)?.symbol} {mainCurrency}
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
      </div>

      {/* Data Section */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('data')}
        </h3>
        <div className="space-y-2">
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
            <p className="text-sm text-muted-foreground">
              {t('deleteConfirmationMessage')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t('processing') : t('deleteAllData')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        {count !== undefined && (
          <span className="text-sm text-muted-foreground">{count}</span>
        )}
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
        <button onClick={onBack} className="text-primary font-medium">
          {backLabel}
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
        <button onClick={onAdd} className="p-2 rounded-full bg-primary text-primary-foreground">
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
  subtitle?: string
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
      <button {...attributes} {...listeners} className="p-1 touch-none cursor-grab active:cursor-grabbing">
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
        <button onClick={onEdit} className="p-2 rounded-full hover:bg-secondary touch-target">
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-full hover:bg-destructive/20 touch-target">
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
        <button onClick={onEdit} className="p-2 rounded-full hover:bg-secondary touch-target">
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-full hover:bg-destructive/20 touch-target">
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  )
}
