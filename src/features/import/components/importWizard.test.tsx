import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ParsedImportData } from '../types'
import { parseBudgetOkCSV } from '../utils/csvParser'

import { BudgetOkImportWizard, type SavedImportState } from './BudgetOkImportWizard'
import { ImportCategoryMapping } from './ImportCategoryMapping'
import { ImportConfirmation } from './ImportConfirmation'
import { ImportDataPreview } from './ImportDataPreview'
import { ImportFileUpload } from './ImportFileUpload'
import { ImportIncomeSourceMapping } from './ImportIncomeSourceMapping'

import {
  accountRepo,
  categoryRepo,
  incomeSourceRepo,
  transactionRepo,
} from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { created, resetDbAndStore } from '@/test/db'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

const HEADER =
  'Operation type, Date,Account,Category,Subcategory,Amount, Currency,Amount_dop,Currency_dop,Comment'
const CSV = [
  HEADER,
  'Income,20260105,wallet,Salary,,500,USD,,,',
  'Expense,20260106,Wallet,Food,,20,USD,,,lunch',
  'Expense,20260107,Card,Taxi,,15,USD,,,',
  'transfer,20260108,Wallet,Card,,50,USD,,,',
].join('\n')

let walletId: number
let cardId: number
let foodId: number
let taxiId: number
let jobId: number

beforeEach(async () => {
  await resetDbAndStore()
  localStorage.setItem('finance-tracker-onboarding-completed', 'true')
  const account = { type: 'cash' as const, currency: 'USD', balance: 0, color: '#000' }
  walletId = await created(accountRepo.create({ ...account, name: 'Wallet' }))
  cardId = await created(accountRepo.create({ ...account, name: 'Visa' }))
  foodId = await created(categoryRepo.create({ name: 'food', color: '#000' }))
  taxiId = await created(categoryRepo.create({ name: 'Transport', color: '#000' }))
  jobId = await created(incomeSourceRepo.create({ name: 'Job', currency: 'USD', color: '#000' }))
  await useAppStore.getState().loadAllData()
})

function csvFile(content = CSV, name = 'export.csv') {
  return new File([content], name, { type: 'text/csv' })
}

function upload(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

function next() {
  fireEvent.click(screen.getByRole('button', { name: 'importNext' }))
}

/** Opens the mapping select on the row for `sourceName` and picks `option`. */
function choose(sourceName: string, option: RegExp) {
  const row = screen
    .getByText(sourceName, { selector: 'span' })
    .closest('.rounded-xl') as HTMLElement
  fireEvent.click(within(row).getByRole('button'))
  fireEvent.click(within(row).getByRole('option', { name: option }))
}

describe('BudgetOkImportWizard', () => {
  it('walks from file upload to a successful import', async () => {
    const onClose = vi.fn()
    const onStateChange = vi.fn()
    render(
      <BudgetOkImportWizard
        open
        onClose={onClose}
        onPause={vi.fn()}
        savedState={undefined}
        onStateChange={onStateChange}
      />
    )

    upload(csvFile())

    // Step 2: preview
    expect(await screen.findByText('export.csv')).toBeInTheDocument()
    expect(screen.getByText('4 importOperations')).toBeInTheDocument()
    next()

    // Step 3: accounts — "wallet" and "Wallet" auto-map case-insensitively, "Card" does not
    expect(screen.getByText('2 / 3 importMapped')).toBeInTheDocument()
    expect(screen.getByText('importAllAccountsMustBeMapped')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'importNext' })).toBeDisabled()
    choose('Card', /Visa/)
    expect(screen.getByText('3 / 3 importMapped')).toBeInTheDocument()
    next()

    // Step 4: categories
    choose('Taxi', /Transport/)
    next()

    // Step 5: income sources
    choose('Salary', /Job/)
    next()

    // Step 6: confirm
    expect(screen.getByText('importReadyToImport')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'importConfirmButton' }))

    expect(await screen.findByText('importSuccess')).toBeInTheDocument()
    const transactions = await transactionRepo.getAll()
    expect(transactions).toHaveLength(4)
    expect(transactions.find((tx) => tx.type === 'expense' && tx.amount === 20)?.categoryId).toBe(
      foodId
    )
    expect(transactions.find((tx) => tx.amount === 15)?.categoryId).toBe(taxiId)
    expect(transactions.find((tx) => tx.type === 'income')?.incomeSourceId).toBe(jobId)
    expect(useAppStore.getState().accounts.find((a) => a.id === cardId)?.balance).toBe(35)

    fireEvent.click(screen.getByRole('button', { name: 'importDone' }))
    expect(onClose).toHaveBeenCalled()
    expect(onStateChange).toHaveBeenCalledWith()
  })

  it('shows validation errors for bad files and lets you go back from the preview', async () => {
    render(
      <BudgetOkImportWizard
        open
        onClose={vi.fn()}
        onPause={vi.fn()}
        savedState={undefined}
        onStateChange={vi.fn()}
      />
    )

    upload(csvFile('x', 'notes.txt'))
    expect(screen.getByText('File must be a CSV file')).toBeInTheDocument()

    upload(csvFile(`${HEADER}\nRefund,20260101,Wallet,Food,,1,USD,,,`))
    expect(await screen.findByText(/Invalid operation type/)).toBeInTheDocument()
    expect(screen.getByText('importFixErrorsBeforeProceeding')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'importNext' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(screen.getByText('importDropOrClick')).toBeInTheDocument()
  })

  it('reports a file that cannot be read', async () => {
    render(
      <BudgetOkImportWizard
        open
        onClose={vi.fn()}
        onPause={vi.fn()}
        savedState={undefined}
        onStateChange={vi.fn()}
      />
    )
    const file = csvFile()
    file.text = () => Promise.reject(new Error('unreadable'))

    upload(file)

    expect(await screen.findByText('unreadable')).toBeInTheDocument()
  })

  it('pauses with its progress and resumes from saved state', async () => {
    const onPause = vi.fn()
    const onStateChange = vi.fn()
    const { unmount } = render(
      <BudgetOkImportWizard
        open
        onClose={vi.fn()}
        onPause={onPause}
        savedState={undefined}
        onStateChange={onStateChange}
      />
    )

    upload(csvFile())
    await screen.findByText('export.csv')
    next()
    fireEvent.click(screen.getByRole('button', { name: 'importPause' }))

    expect(onPause).toHaveBeenCalled()
    const saved = onStateChange.mock.calls[0][0] as SavedImportState
    expect(saved).toMatchObject({ step: 3, fileName: 'export.csv' })
    expect(saved.accountMapping.get('wallet')).toBe(walletId)
    unmount()

    render(
      <BudgetOkImportWizard
        open
        onClose={vi.fn()}
        onPause={vi.fn()}
        savedState={saved}
        onStateChange={vi.fn()}
      />
    )
    expect(screen.getByText('importMapAccountsHint')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(screen.getByText('export.csv')).toBeInTheDocument()
  })
})

describe('ImportFileUpload', () => {
  it('accepts dropped files and opens the picker from the drop zone', () => {
    const onFileSelect = vi.fn()
    const setError = vi.fn()
    render(<ImportFileUpload onFileSelect={onFileSelect} error={undefined} setError={setError} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    const zone = screen.getByText('importDropOrClick').closest('[role="button"]') as HTMLElement

    fireEvent.drop(zone, { dataTransfer: { files: [] } })
    fireEvent.drop(zone, { dataTransfer: { files: [csvFile('x', 'a.txt')] } })
    expect(setError).toHaveBeenCalledWith('File must be a CSV file')

    const file = csvFile()
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(onFileSelect).toHaveBeenCalledWith(file)

    fireEvent.dragOver(zone)
    fireEvent.click(zone)
    fireEvent.keyDown(zone, { key: 'Enter' })
    fireEvent.keyDown(zone, { key: 'a' })
    fireEvent.click(screen.getByRole('button', { name: 'importChooseFile' }))
    fireEvent.change(input, { target: { files: [] } })
    expect(click).toHaveBeenCalled()
  })
})

describe('ImportDataPreview', () => {
  it('shows only the first five rows and counts the rest', () => {
    const rows = Array.from({ length: 7 }, (_, i) => `Expense,2026010${i + 1},W,Food,,1,USD,,,`)
    const data = parseBudgetOkCSV([HEADER, ...rows].join('\n'))
    render(<ImportDataPreview data={data} fileName="f.csv" onNext={vi.fn()} onBack={vi.fn()} />)

    expect(screen.getAllByText(/W → Food/)).toHaveLength(5)
    expect(screen.getByText('... importAndMore')).toBeInTheDocument()
  })
})

describe('mapping steps with nothing to map', () => {
  it('lets you continue straight away', () => {
    const onNext = vi.fn()
    const onBack = vi.fn()
    render(
      <>
        <ImportCategoryMapping
          uniqueCategories={[]}
          categories={[]}
          mapping={new Map()}
          onMappingChange={vi.fn()}
          onNext={onNext}
          onBack={onBack}
        />
        <ImportIncomeSourceMapping
          uniqueIncomeSources={[]}
          incomeSources={[]}
          mapping={new Map()}
          onMappingChange={vi.fn()}
          onNext={onNext}
          onBack={onBack}
        />
      </>
    )

    expect(screen.getByText('importNoCategoriesNeeded')).toBeInTheDocument()
    expect(screen.getByText('importNoIncomeSourcesNeeded')).toBeInTheDocument()
    for (const button of screen.getAllByRole('button', { name: 'importNext' }))
      fireEvent.click(button)
    for (const button of screen.getAllByRole('button', { name: 'back' })) fireEvent.click(button)
    expect(onNext).toHaveBeenCalledTimes(2)
    expect(onBack).toHaveBeenCalledTimes(2)
  })
})

describe('ImportConfirmation', () => {
  const data: ParsedImportData = parseBudgetOkCSV(CSV)
  const handlers = { onImport: vi.fn(), onBack: vi.fn(), onClose: vi.fn() }

  it('warns when not every operation will be imported', () => {
    render(
      <ImportConfirmation
        data={{ ...data, rows: data.rows.slice(1) }}
        isImporting={false}
        importResult={undefined}
        {...handlers}
      />
    )

    expect(screen.getByText('importCountMismatch')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'importConfirmButton' })).toBeDisabled()
  })

  it('shows progress while importing', () => {
    render(<ImportConfirmation data={data} isImporting importResult={undefined} {...handlers} />)

    expect(screen.getByRole('button', { name: 'importImporting' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'back' })).toBeDisabled()
  })

  it.each([
    ['the error message', 'disk full', 'disk full'],
    ['a generic message', undefined, 'importUnknownError'],
  ])('shows %s when the import fails', (_name, error, text) => {
    render(
      <ImportConfirmation
        data={data}
        isImporting={false}
        importResult={{ success: false, importedCount: 0, error }}
        {...handlers}
      />
    )

    expect(screen.getByText('importFailed')).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(handlers.onClose).toHaveBeenCalled()
  })
})
