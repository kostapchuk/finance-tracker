import { test, expect, type SyncMode } from '../fixtures/test-base'
import { AccountForm } from '../page-objects/components/account-form'
import { CategoryForm } from '../page-objects/components/category-form'

type SyncModeType = SyncMode

const syncModes: SyncModeType[] = [
  'sync-disabled',
  'sync-disabled-offline',
  'sync-enabled-online',
  'sync-enabled-offline',
]

type CreateScenario = {
  name: string
  amount: string
  comment?: string
  dateOffset?: number
}

type EditScenario = {
  name: string
  editAmount?: string
  editComment?: string
  editDateOffset?: number
  initialComment?: string
  initialDateOffset?: number
}

const createScenarios: CreateScenario[] = [
  { name: 'amount only', amount: '100' },
  { name: 'amount with comment', amount: '200', comment: 'Test comment' },
  { name: 'amount with date', amount: '300', dateOffset: -1 },
  { name: 'amount with comment and date', amount: '400', comment: 'Full test', dateOffset: -2 },
]

const editScenarios: EditScenario[] = [
  { name: 'amount only', editAmount: '1500' },
  { name: 'comment only', initialComment: 'Initial', editComment: 'Updated comment' },
  { name: 'date only', initialDateOffset: 0, editDateOffset: -3 },
  { name: 'amount and comment', editAmount: '2000', editComment: 'New comment' },
  { name: 'amount and date', editAmount: '2500', editDateOffset: -1 },
  { name: 'comment and date', initialComment: 'Old', editComment: 'New', editDateOffset: -2 },
  {
    name: 'amount, comment and date',
    editAmount: '3000',
    editComment: 'All updated',
    editDateOffset: -1,
  },
]

function getDateStr(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().split('T')[0]
}

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

for (const mode of syncModes) {
  test.describe(`[${mode}] Expense Transaction Create Scenarios`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    for (const scenario of createScenarios) {
      test(`should create expense: ${scenario.name}`, async ({
        page,
        dashboardPage,
        historyPage,
        reportPage,
        syncHelper,
      }) => {
        await dashboardPage.navigateTo('dashboard')

        // Create account via UI
        const accountForm = new AccountForm(page)
        await dashboardPage.getAddAccountButton().click()
        await accountForm.fillName('USD Cash')
        await accountForm.selectType('cash')
        await accountForm.selectCurrency('USD')
        await accountForm.fillBalance('1000')
        await accountForm.save()
        await expect(dashboardPage.getAccountByName('USD Cash')).toBeVisible({ timeout: 5000 })

        // Create category via UI
        const categoryForm = new CategoryForm(page)
        await dashboardPage.getAddCategoryButton().click()
        await categoryForm.fillName('Food')
        await categoryForm.save()
        await expect(dashboardPage.getCategoryByName('Food')).toBeVisible({ timeout: 5000 })

        // Perform drag and drop (account -> category for expense)
        await dashboardPage.dragAccountToCategory('USD Cash', 'Food')

        // Fill amount
        const amountInputs = page.locator('input[inputmode="decimal"], input[inputMode="decimal"]')
        await expect(amountInputs.first()).toBeVisible({ timeout: 2000 })
        const inputCount = await amountInputs.count()
        await amountInputs.first().fill(scenario.amount)
        if (inputCount > 1) {
          await amountInputs.nth(1).fill(scenario.amount)
        }

        // Add comment if specified
        if (scenario.comment) {
          const commentTextarea = page.locator('textarea')
          await commentTextarea.fill(scenario.comment)
        }

        // Set date if specified
        if (scenario.dateOffset !== undefined) {
          const dateStr = getDateStr(scenario.dateOffset)
          const dateInput = page.locator('input[type="date"]')
          await dateInput.fill(dateStr)
        }

        await page
          .locator('button')
          .filter({ hasText: /save|сохранить/i })
          .click()
        await page.waitForTimeout(500)

        // Calculate expected balance
        const expectedBalance = 1000 - parseInt(scenario.amount)
        const amountNum = parseInt(scenario.amount)

        // Verify dashboard: account balance
        await dashboardPage.navigateTo('dashboard')
        const accountElement = dashboardPage.getAccountByName('USD Cash')
        const accountText = await accountElement.textContent()
        expect(accountText).toContain(formatAmount(expectedBalance))

        // Verify history page
        await historyPage.navigateTo('history')
        const txEl = historyPage.getTransactionByTitle('Food')
        await expect(txEl).toBeVisible()

        // Verify amount
        const amountText = await historyPage.getTransactionAmountByTitle('Food').textContent()
        expect(amountText).toContain(formatAmount(amountNum))

        // Verify account name and comment if present
        const txFullText = await txEl.textContent()
        expect(txFullText).toContain('USD Cash')
        if (scenario.comment) {
          expect(txFullText).toContain(scenario.comment)
        }

        // Verify report page
        await reportPage.navigateTo('report')
        const expensesAmount = await reportPage.getExpensesAmount().textContent()
        expect(expensesAmount).toContain(formatAmount(amountNum))

        // Verify sync for sync-enabled modes
        if (mode.startsWith('sync-enabled')) {
          await syncHelper.waitForSyncToComplete()
          const remoteTransactions = syncHelper.getMockRemoteData('transactions')
          expect(remoteTransactions.length).toBe(1)
          expect(remoteTransactions[0].amount).toBe(amountNum)
        }
      })
    }
  })

  test.describe(`[${mode}] Expense Transaction Edit Scenarios`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    for (const scenario of editScenarios) {
      test(`should edit: ${scenario.name}`, async ({
        page,
        dashboardPage,
        historyPage,
        reportPage,
        syncHelper,
      }) => {
        const initialAmount = 1000
        const expectedFinalAmount = scenario.editAmount
          ? parseInt(scenario.editAmount)
          : initialAmount

        await dashboardPage.navigateTo('dashboard')

        // Create account via UI
        const accountForm = new AccountForm(page)
        await dashboardPage.getAddAccountButton().click()
        await accountForm.fillName('USD Cash')
        await accountForm.selectType('cash')
        await accountForm.selectCurrency('USD')
        await accountForm.fillBalance('2000')
        await accountForm.save()
        await expect(dashboardPage.getAccountByName('USD Cash')).toBeVisible({ timeout: 5000 })

        // Create category via UI
        const categoryForm = new CategoryForm(page)
        await dashboardPage.getAddCategoryButton().click()
        await categoryForm.fillName('Food')
        await categoryForm.save()
        await expect(dashboardPage.getCategoryByName('Food')).toBeVisible({ timeout: 5000 })

        // Create initial transaction
        await dashboardPage.dragAccountToCategory('USD Cash', 'Food')

        const amountInputs = page.locator('input[inputmode="decimal"], input[inputMode="decimal"]')
        await expect(amountInputs.first()).toBeVisible({ timeout: 2000 })
        const inputCount = await amountInputs.count()
        await amountInputs.first().fill(initialAmount.toString())
        if (inputCount > 1) {
          await amountInputs.nth(1).fill(initialAmount.toString())
        }

        if (scenario.initialComment) {
          const commentTextarea = page.locator('textarea')
          await commentTextarea.fill(scenario.initialComment)
        }

        if (scenario.initialDateOffset !== undefined) {
          const dateStr = getDateStr(scenario.initialDateOffset)
          const dateInput = page.locator('input[type="date"]')
          await dateInput.fill(dateStr)
        }

        await page
          .locator('button')
          .filter({ hasText: /save|сохранить/i })
          .click()
        await page.waitForTimeout(500)

        // Navigate to history and edit
        await historyPage.navigateTo('history')
        await historyPage.clickTransactionByComment(scenario.initialComment || 'Food')
        await page.waitForTimeout(300)

        // Edit fields based on scenario
        if (scenario.editAmount) {
          const editAmountInputs = page.locator('input[inputmode="decimal"]')
          const editInputCount = await editAmountInputs.count()
          await editAmountInputs.first().click()
          await editAmountInputs.first().fill(scenario.editAmount)
          if (editInputCount > 1) {
            await editAmountInputs.nth(1).click()
            await editAmountInputs.nth(1).fill(scenario.editAmount)
          }
        }

        if (scenario.editComment !== undefined) {
          const editCommentTextarea = page.locator('textarea')
          await editCommentTextarea.fill(scenario.editComment)
        }

        if (scenario.editDateOffset !== undefined) {
          const dateStr = getDateStr(scenario.editDateOffset)
          const dateInput = page.locator('input[type="date"]')
          await dateInput.fill(dateStr)
        }

        await page
          .locator('button')
          .filter({ hasText: /update|обновить/i })
          .click()
        await page.waitForTimeout(500)

        // Verify dashboard balance
        const expectedBalance = 2000 - expectedFinalAmount
        await dashboardPage.navigateTo('dashboard')
        const accountElement = dashboardPage.getAccountByName('USD Cash')
        const accountText = await accountElement.textContent()
        expect(accountText).toContain(formatAmount(expectedBalance))

        // Verify history
        await historyPage.navigateTo('history')
        const txEl = historyPage.getTransactionByTitle('Food')
        await expect(txEl).toBeVisible()

        // Verify amount
        const amountText = await historyPage.getTransactionAmountByTitle('Food').textContent()
        expect(amountText).toContain(formatAmount(expectedFinalAmount))

        // Verify account name
        const txFullText = await txEl.textContent()
        expect(txFullText).toContain('USD Cash')

        // Verify comment (either edited or initial)
        if (scenario.editComment !== undefined) {
          expect(txFullText).toContain(scenario.editComment)
        } else if (scenario.initialComment) {
          expect(txFullText).toContain(scenario.initialComment)
        }

        // Verify report
        await reportPage.navigateTo('report')
        const expensesAmount = await reportPage.getExpensesAmount().textContent()
        expect(expensesAmount).toContain(formatAmount(expectedFinalAmount))
      })
    }
  })

  test.describe(`[${mode}] Expense Transaction Delete`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should delete expense transaction and reverse balance', async ({
      page,
      dashboardPage,
      historyPage,
      reportPage,
      syncHelper,
    }) => {
      await dashboardPage.navigateTo('dashboard')

      // Create account via UI
      const accountForm = new AccountForm(page)
      await dashboardPage.getAddAccountButton().click()
      await accountForm.fillName('USD Cash')
      await accountForm.selectType('cash')
      await accountForm.selectCurrency('USD')
      await accountForm.fillBalance('1000')
      await accountForm.save()
      await expect(dashboardPage.getAccountByName('USD Cash')).toBeVisible({ timeout: 5000 })

      // Create category via UI
      const categoryForm = new CategoryForm(page)
      await dashboardPage.getAddCategoryButton().click()
      await categoryForm.fillName('Food')
      await categoryForm.save()
      await expect(dashboardPage.getCategoryByName('Food')).toBeVisible({ timeout: 5000 })

      // Create transaction
      await dashboardPage.dragAccountToCategory('USD Cash', 'Food')

      const amountInputs = page.locator('input[inputmode="decimal"], input[inputMode="decimal"]')
      await expect(amountInputs.first()).toBeVisible({ timeout: 2000 })
      const inputCount = await amountInputs.count()
      await amountInputs.first().fill('500')
      if (inputCount > 1) {
        await amountInputs.nth(1).fill('500')
      }

      await page
        .locator('button')
        .filter({ hasText: /save|сохранить/i })
        .click()
      await page.waitForTimeout(500)

      // Verify balance decreased
      await dashboardPage.navigateTo('dashboard')
      const accountElement = dashboardPage.getAccountByName('USD Cash')
      const accountText = await accountElement.textContent()
      expect(accountText).toContain(formatAmount(500))

      // Accept delete confirmation dialog
      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Navigate to history and delete
      await historyPage.navigateTo('history')
      await historyPage.clickTransactionByComment('Food')
      await page.waitForTimeout(300)

      await page
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') })
        .click()
      await page.waitForTimeout(500)

      // Verify dashboard: balance reversed
      await dashboardPage.navigateTo('dashboard')
      const accountAfterDelete = dashboardPage.getAccountByName('USD Cash')
      const accountTextAfterDelete = await accountAfterDelete.textContent()
      expect(accountTextAfterDelete).toContain(formatAmount(1000))

      // Verify history: transaction not visible
      await historyPage.navigateTo('history')
      await expect(historyPage.getTransactionByTitle('Food')).not.toBeVisible()

      // Verify report: expenses shows 0
      await reportPage.navigateTo('report')
      const expensesAmount = await reportPage.getExpensesAmount().textContent()
      expect(expensesAmount).toContain('0')

      // Verify sync for sync-enabled modes
      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBe(0)
      }
    })
  })
}
