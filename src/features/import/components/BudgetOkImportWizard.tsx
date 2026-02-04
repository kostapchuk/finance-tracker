import { useState, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { parseBudgetOkCSV } from '../utils/csvParser'
import { executeImport } from '../utils/importExecutor'
import { ImportFileUpload } from './ImportFileUpload'
import { ImportDataPreview } from './ImportDataPreview'
import { ImportAccountMapping } from './ImportAccountMapping'
import { ImportCategoryMapping } from './ImportCategoryMapping'
import { ImportIncomeSourceMapping } from './ImportIncomeSourceMapping'
import { ImportConfirmation } from './ImportConfirmation'
import type { ImportWizardStep, ParsedImportData, ImportResult } from '../types'

interface BudgetOkImportWizardProps {
  open: boolean
  onClose: () => void
}

export function BudgetOkImportWizard({ open, onClose }: BudgetOkImportWizardProps) {
  const { t } = useLanguage()
  const { accounts, categories, incomeSources, loadAllData } = useAppStore()

  // Wizard state
  const [step, setStep] = useState<ImportWizardStep>(1)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null)
  const [accountMapping, setAccountMapping] = useState<Map<string, number>>(new Map())
  const [categoryMapping, setCategoryMapping] = useState<Map<string, number>>(new Map())
  const [incomeSourceMapping, setIncomeSourceMapping] = useState<Map<string, number>>(new Map())
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Reset state when dialog closes
  const handleClose = useCallback(() => {
    setStep(1)
    setFile(null)
    setFileError(null)
    setParsedData(null)
    setAccountMapping(new Map())
    setCategoryMapping(new Map())
    setIncomeSourceMapping(new Map())
    setIsImporting(false)
    setImportResult(null)
    onClose()
  }, [onClose])

  // Step 1: File selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
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
  }, [accounts, categories, incomeSources])

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
        // Refresh all data after successful import
        await loadAllData()
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
  }, [parsedData, accountMapping, categoryMapping, incomeSourceMapping, accounts, loadAllData])

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
          <h2 className="font-semibold">{t('importFromBudgetOk')}</h2>
          <p className="text-xs text-muted-foreground">{stepTitles[step]}</p>
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

          {step === 2 && parsedData && file && (
            <ImportDataPreview
              data={parsedData}
              fileName={file.name}
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
