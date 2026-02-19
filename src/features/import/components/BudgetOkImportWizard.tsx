import { useQueryClient } from '@tanstack/react-query'
import { Pause } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'

import type { ImportWizardStep, ParsedImportData, ImportResult } from '../types'
import { parseBudgetOkCSV } from '../utils/csvParser'
import { executeImport } from '../utils/importExecutor'

import { ImportAccountMapping } from './ImportAccountMapping'
import { ImportCategoryMapping } from './ImportCategoryMapping'
import { ImportConfirmation } from './ImportConfirmation'
import { ImportDataPreview } from './ImportDataPreview'
import { ImportFileUpload } from './ImportFileUpload'
import { ImportIncomeSourceMapping } from './ImportIncomeSourceMapping'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAccounts, useCategories, useIncomeSources } from '@/hooks/useDataHooks'
import { useLanguage } from '@/hooks/useLanguage'

interface BudgetOkImportWizardProps {
  open: boolean
  onClose: () => void
  onPause: () => void
  // Persisted state from parent
  savedState: SavedImportState | null
  onStateChange: (state: SavedImportState | null) => void
}

export interface SavedImportState {
  step: ImportWizardStep
  file: File | null
  fileName: string
  parsedData: ParsedImportData | null
  accountMapping: Map<string, number>
  categoryMapping: Map<string, number>
  incomeSourceMapping: Map<string, number>
}

export function BudgetOkImportWizard({
  open,
  onClose,
  onPause,
  savedState,
  onStateChange,
}: BudgetOkImportWizardProps) {
  const { t } = useLanguage()
  const { data: accountsData = [] } = useAccounts()
  const { data: categoriesData = [] } = useCategories()
  const { data: incomeSourcesData = [] } = useIncomeSources()

  const accounts = accountsData
  const categories = categoriesData
  const incomeSources = incomeSourcesData

  const queryClient = useQueryClient()

  // Wizard state - initialize from saved state if available
  const [step, setStep] = useState<ImportWizardStep>(savedState?.step ?? 1)
  const [file, setFile] = useState<File | null>(savedState?.file ?? null)
  const [fileName, setFileName] = useState<string>(savedState?.fileName ?? '')
  const [fileError, setFileError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(
    savedState?.parsedData ?? null
  )
  const [accountMapping, setAccountMapping] = useState<Map<string, number>>(
    savedState?.accountMapping ?? new Map()
  )
  const [categoryMapping, setCategoryMapping] = useState<Map<string, number>>(
    savedState?.categoryMapping ?? new Map()
  )
  const [incomeSourceMapping, setIncomeSourceMapping] = useState<Map<string, number>>(
    savedState?.incomeSourceMapping ?? new Map()
  )
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Restore state when savedState changes (e.g., when resuming)
  useEffect(() => {
    if (savedState && open) {
      setStep(savedState.step)
      setFile(savedState.file)
      setFileName(savedState.fileName)
      setParsedData(savedState.parsedData)
      setAccountMapping(savedState.accountMapping)
      setCategoryMapping(savedState.categoryMapping)
      setIncomeSourceMapping(savedState.incomeSourceMapping)
    }
  }, [open, savedState])

  // Save state to parent when it changes (for pause/resume)
  const saveCurrentState = useCallback(() => {
    if (step > 1 && parsedData) {
      onStateChange({
        step,
        file,
        fileName,
        parsedData,
        accountMapping,
        categoryMapping,
        incomeSourceMapping,
      })
    }
  }, [
    step,
    file,
    fileName,
    parsedData,
    accountMapping,
    categoryMapping,
    incomeSourceMapping,
    onStateChange,
  ])

  // Handle pause - save state and close
  const handlePause = useCallback(() => {
    saveCurrentState()
    onPause()
  }, [saveCurrentState, onPause])

  // Reset state completely when finishing or canceling
  const handleClose = useCallback(() => {
    setStep(1)
    setFile(null)
    setFileName('')
    setFileError(null)
    setParsedData(null)
    setAccountMapping(new Map())
    setCategoryMapping(new Map())
    setIncomeSourceMapping(new Map())
    setIsImporting(false)
    setImportResult(null)
    onStateChange(null) // Clear saved state
    onClose()
  }, [onClose, onStateChange])

  // Step 1: File selection
  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile)
      setFileName(selectedFile.name)
      setFileError(null)

      try {
        const content = await selectedFile.text()
        const parsed = parseBudgetOkCSV(content)
        setParsedData(parsed)

        // Auto-map accounts with exact name matches
        const autoAccountMap = new Map<string, number>()
        for (const sourceAccount of parsed.uniqueAccounts) {
          const matchingAccount = accounts.find(
            (a) => a.name.toLowerCase() === sourceAccount.name.toLowerCase()
          )
          if (matchingAccount?.id) {
            autoAccountMap.set(sourceAccount.name, matchingAccount.id)
          }
        }
        setAccountMapping(autoAccountMap)

        // Auto-map categories with exact name matches
        const autoCategoryMap = new Map<string, number>()
        for (const budgetOkName of parsed.uniqueCategories) {
          const matchingCategory = categories.find(
            (c) => c.name.toLowerCase() === budgetOkName.toLowerCase()
          )
          if (matchingCategory?.id) {
            autoCategoryMap.set(budgetOkName, matchingCategory.id)
          }
        }
        setCategoryMapping(autoCategoryMap)

        // Auto-map income sources with exact name matches
        const autoIncomeMap = new Map<string, number>()
        for (const budgetOkName of parsed.uniqueIncomeSources) {
          const matchingSource = incomeSources.find(
            (s) => s.name.toLowerCase() === budgetOkName.toLowerCase()
          )
          if (matchingSource?.id) {
            autoIncomeMap.set(budgetOkName, matchingSource.id)
          }
        }
        setIncomeSourceMapping(autoIncomeMap)

        setStep(2)
      } catch (error) {
        setFileError(error instanceof Error ? error.message : 'Failed to parse file')
      }
    },
    [accounts, categories, incomeSources]
  )

  // Account mapping change
  const handleAccountMappingChange = useCallback(
    (budgetOkName: string, accountId: number | null) => {
      setAccountMapping((prev) => {
        const next = new Map(prev)
        if (accountId === null) {
          next.delete(budgetOkName)
        } else {
          next.set(budgetOkName, accountId)
        }
        return next
      })
    },
    []
  )

  // Category mapping change
  const handleCategoryMappingChange = useCallback(
    (budgetOkName: string, categoryId: number | null) => {
      setCategoryMapping((prev) => {
        const next = new Map(prev)
        if (categoryId === null) {
          next.delete(budgetOkName)
        } else {
          next.set(budgetOkName, categoryId)
        }
        return next
      })
    },
    []
  )

  // Income source mapping change
  const handleIncomeSourceMappingChange = useCallback(
    (budgetOkName: string, incomeSourceId: number | null) => {
      setIncomeSourceMapping((prev) => {
        const next = new Map(prev)
        if (incomeSourceId === null) {
          next.delete(budgetOkName)
        } else {
          next.set(budgetOkName, incomeSourceId)
        }
        return next
      })
    },
    []
  )

  // Execute import
  const handleImport = useCallback(async () => {
    if (!parsedData) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const result = await executeImport({
        rows: parsedData.rows,
        accountMapping,
        categoryMapping,
        incomeSourceMapping,
        accounts,
      })

      setImportResult(result)

      if (result.success) {
        // Directly set query data from database to ensure UI updates
        const [accounts, incomeSources, categories, transactions, loans] = await Promise.all([
          (await import('@/database/repositories')).accountRepo.getAll(),
          (await import('@/database/repositories')).incomeSourceRepo.getAll(),
          (await import('@/database/repositories')).categoryRepo.getAll(),
          (await import('@/database/repositories')).transactionRepo.getAll(),
          (await import('@/database/repositories')).loanRepo.getAll(),
        ])

        queryClient.setQueryData(['accounts'], accounts)
        queryClient.setQueryData(['incomeSources'], incomeSources)
        queryClient.setQueryData(['categories'], categories)
        queryClient.setQueryData(['transactions'], transactions)
        queryClient.setQueryData(['loans'], loans)
      }
    } catch (error) {
      setImportResult({
        success: false,
        importedCount: 0,
        error: error instanceof Error ? error.message : 'Import failed',
      })
    } finally {
      setIsImporting(false)
    }
  }, [parsedData, accountMapping, categoryMapping, incomeSourceMapping, accounts, queryClient])

  // Step titles for progress indicator
  const stepTitles: Record<ImportWizardStep, string> = {
    1: t('importSelectFile'),
    2: t('importPreviewData'),
    3: t('importMapAccounts'),
    4: t('importMapCategories'),
    5: t('importMapIncomeSources'),
    6: t('importConfirm'),
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            {step > 1 && step < 6 && !isImporting && (
              <Button variant="outline" size="sm" onClick={handlePause} className="gap-1">
                <Pause className="h-3 w-3" />
                {t('importPause')}
              </Button>
            )}
            <div>
              <h2 className="font-semibold">{t('importFromBudgetOk')}</h2>
              <p className="text-xs text-muted-foreground">{stepTitles[step]}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-2">
          <div className="flex gap-1">
            {([1, 2, 3, 4, 5, 6] as ImportWizardStep[]).map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden">
          {step === 1 && (
            <ImportFileUpload
              onFileSelect={handleFileSelect}
              error={fileError}
              setError={setFileError}
            />
          )}

          {step === 2 && parsedData && (
            <ImportDataPreview
              data={parsedData}
              fileName={fileName}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && parsedData && (
            <ImportAccountMapping
              uniqueAccounts={parsedData.uniqueAccounts}
              accounts={accounts}
              mapping={accountMapping}
              onMappingChange={handleAccountMappingChange}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && parsedData && (
            <ImportCategoryMapping
              uniqueCategories={parsedData.uniqueCategories}
              categories={categories}
              mapping={categoryMapping}
              onMappingChange={handleCategoryMappingChange}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}

          {step === 5 && parsedData && (
            <ImportIncomeSourceMapping
              uniqueIncomeSources={parsedData.uniqueIncomeSources}
              incomeSources={incomeSources}
              mapping={incomeSourceMapping}
              onMappingChange={handleIncomeSourceMappingChange}
              onNext={() => setStep(6)}
              onBack={() => setStep(4)}
            />
          )}

          {step === 6 && parsedData && (
            <ImportConfirmation
              data={parsedData}
              isImporting={isImporting}
              importResult={importResult}
              onImport={handleImport}
              onBack={() => setStep(5)}
              onClose={handleClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
