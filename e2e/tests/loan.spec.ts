import { test, expect, type SyncMode } from '../fixtures/test-base'
import { LoanForm } from '../page-objects/components/loan-form'
import { testAccounts } from '../fixtures/test-data'

const syncModes: SyncMode[] = [
  'sync-disabled',
  'sync-disabled-offline',
  'sync-enabled-online',
  'sync-enabled-offline',
]

for (const mode of syncModes) {
  test.describe(`[${mode}] Loan Management`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should create a loan given (money lent out) - account balance decreases', async ({
      page,
      loansPage,
      historyPage,
      reportPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())

      await dbHelper.refreshStoreData()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      // Wait for accounts to load in the form (critical for offline mode)
      await loanForm.waitForAccountsToLoad()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('John Doe')
      await loanForm.fillDescription('Vacation loan')
      // Select USD currency BEFORE account to avoid multi-currency mode
      await loanForm.selectCurrency('USD')
      // Account should already be selected, but try to select anyway
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAmount('500')
      await loanForm.save()

      // 1. Verify loan appears in loans page
      await expect(loansPage.getLoanByPersonName('John Doe')).toBeVisible()

      // 2. Verify account balance decreased (read directly from IndexedDB)
      const newBalance = await dbHelper.getAccountBalance(accountId)
      expect(newBalance).toBe(initialBalance - 500)

      // 3. Verify transaction was created
      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(1)

      // 4. Verify transaction appears in history page
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('John Doe')).toBeVisible()

      // 5. Verify history page summary reflects the loan (outflows increased)
      const outflowsText = await historyPage.getOutflowsAmount().textContent()
      expect(outflowsText).toContain('500')

      // 6. Verify report page shows loan in loan stats section
      await reportPage.navigateTo('report')
      const owedToYouText = await reportPage.getOwedToYouAmount().textContent()
      expect(owedToYouText).toContain('500')

      // Only verify remote data for sync-enabled-online mode (not offline)
      if (mode === 'sync-enabled-online') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans.length).toBe(1)
        expect(remoteLoans[0].personName).toBe('John Doe')
        expect(remoteLoans[0].type).toBe('given')
      }
    })

    test('should create a loan received (money borrowed) - account balance increases', async ({
      page,
      loansPage,
      historyPage,
      reportPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      // Wait for accounts to load in the form
      await loanForm.waitForAccountsToLoad()

      await loanForm.selectType('received')
      await loanForm.fillPersonName('Jane Smith')
      await loanForm.fillDescription('Personal loan')
      // Select USD currency BEFORE account to avoid multi-currency mode
      await loanForm.selectCurrency('USD')
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAmount('1000')
      await loanForm.save()

      // 1. Verify loan appears in loans page
      await expect(loansPage.getLoanByPersonName('Jane Smith')).toBeVisible()

      // 2. Verify account balance increased
      const newBalance = await dbHelper.getAccountBalance(accountId)
      expect(newBalance).toBe(initialBalance + 1000)

      // 3. Verify transaction appears in history page
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Jane Smith')).toBeVisible()

      // 4. Verify history page summary reflects the loan (inflows increased)
      const inflowsText = await historyPage.getInflowsAmount().textContent()
      expect(inflowsText).toContain('1,000')

      // 5. Verify report page shows the debt in "You owe" section
      await reportPage.navigateTo('report')
      const youOweAmount = await reportPage.getYouOweAmount().textContent()
      expect(youOweAmount).toContain('1,000')

      // Only verify remote data for sync-enabled-online mode (not offline)
      if (mode === 'sync-enabled-online') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans.length).toBe(1)
        expect(remoteLoans[0].type).toBe('received')
      }
    })

    test('should create multi-currency loan (EUR loan, USD account)', async ({
      page,
      loansPage,
      historyPage,
      reportPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      // Wait for accounts to load in the form
      await loanForm.waitForAccountsToLoad()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('Pierre')
      await loanForm.fillDescription('EUR loan')
      await loanForm.fillAmount('200')
      await loanForm.selectCurrency('EUR')
      await loanForm.selectAccount('USD Cash')

      const isMultiCurrency = await loanForm.isMultiCurrencyMode()
      expect(isMultiCurrency).toBe(true)

      await loanForm.fillAccountAmount('220')
      await loanForm.save()

      // 1. Verify account balance decreased by account amount (USD)
      const newBalance = await dbHelper.getAccountBalance(accountId)
      expect(newBalance).toBe(initialBalance - 220)

      // 2. Verify transaction appears in history page
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Pierre')).toBeVisible()

      // 3. Verify report page shows the loan in "Owed to you" section
      await reportPage.navigateTo('report')
      const owedToYouAmount = await reportPage.getOwedToYouAmount().textContent()
      expect(owedToYouAmount).toContain('200')

      // Only verify remote data for sync-enabled-online mode (not offline)
      if (mode === 'sync-enabled-online') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].currency).toBe('EUR')
      }
    })

    test('should set due date for loan', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      // Wait for accounts to load in the form
      await loanForm.waitForAccountsToLoad()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('Bob')
      // Select USD currency BEFORE account to avoid multi-currency mode
      await loanForm.selectCurrency('USD')
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAmount('300')
      await loanForm.setDueDate('2025-06-15')
      await loanForm.save()

      // 1. Verify loan appears in loans page
      await expect(loansPage.getLoanByPersonName('Bob')).toBeVisible()

      // 2. Verify transaction appears in history page
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Bob')).toBeVisible()

      // Only verify remote data for sync-enabled-online mode (not offline)
      if (mode === 'sync-enabled-online') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].dueDate).toBeDefined()
      }
    })

    test('should show loan summary amounts correctly', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      // Wait for accounts to load in the form
      await loanForm.waitForAccountsToLoad()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('Person A')
      // Select USD currency BEFORE account to avoid multi-currency mode
      await loanForm.selectCurrency('USD')
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAmount('1000')
      await loanForm.save()

      await loansPage.clickAdd()

      // Wait for accounts to load in the form (second loan)
      await loanForm.waitForAccountsToLoad()

      await loanForm.selectType('received')
      await loanForm.fillPersonName('Person B')
      // Select USD currency BEFORE account to avoid multi-currency mode
      await loanForm.selectCurrency('USD')
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAmount('500')
      await loanForm.save()

      // 1. Verify loans page summary
      await expect(loansPage.getOwedToYouAmount()).toContainText('1,000')
      await expect(loansPage.getYouOweAmount()).toContainText('500')

      // 2. Verify both transactions appear in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Person A')).toBeVisible()
      await expect(historyPage.getTransactionByTitle('Person B')).toBeVisible()

      // Only verify remote data for sync-enabled-online mode (not offline)
      if (mode === 'sync-enabled-online') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans.length).toBe(2)
      }
    })

    test('should persist loan after offline and back online', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      if (mode !== 'sync-enabled-offline') {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      // Wait for accounts to load in the form
      await loanForm.waitForAccountsToLoad()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('Offline Loan')
      // Select USD currency BEFORE account to avoid multi-currency mode
      await loanForm.selectCurrency('USD')
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAmount('750')
      await loanForm.save()

      // 1. Verify loan appears in loans page
      await expect(loansPage.getLoanByPersonName('Offline Loan')).toBeVisible()

      // 2. Verify transaction appears in history page
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Offline Loan')).toBeVisible()

      // 3. Capture state before going online
      const balanceBeforeOnline = await dbHelper.getAccountBalance(accountId)
      const txCountBeforeOnline = await dbHelper.getTransactionCount()

      // 4. Verify sync queue has pending items
      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      // 5. Go online and verify sync completes
      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      // 6. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 7. Verify balance unchanged after reload
      const balanceAfterReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterReload).toBe(balanceBeforeOnline)

      // 8. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeOnline)

      // 9. Verify loan still visible in loans page
      await loansPage.navigateTo('loans')
      await expect(loansPage.getLoanByPersonName('Offline Loan')).toBeVisible()

      // 10. Verify transaction still in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Offline Loan')).toBeVisible()

      // 11. Verify remote data
      const remoteLoans = syncHelper.getMockRemoteData('loans')
      expect(remoteLoans.length).toBe(1)
      expect(remoteLoans[0].personName).toBe('Offline Loan')
    })

    test('should persist loan in offline mode without sync', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      if (mode !== 'sync-disabled-offline') {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      // Wait for accounts to load in the form
      await loanForm.waitForAccountsToLoad()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('Offline No Sync Loan')
      await loanForm.selectCurrency('USD')
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAmount('300')
      await loanForm.save()

      // 1. Verify loan appears in loans page
      await expect(loansPage.getLoanByPersonName('Offline No Sync Loan')).toBeVisible()

      // 2. Verify account balance decreased
      const balanceBeforeReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceBeforeReload).toBe(initialBalance - 300)

      // 3. Verify transaction in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Offline No Sync Loan')).toBeVisible()

      // 4. Capture state
      const txCountBeforeReload = await dbHelper.getTransactionCount()

      // 5. Go online and reload page to verify data persists
      await syncHelper.goOnline()
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 6. Verify balance unchanged after reload
      const balanceAfterReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterReload).toBe(balanceBeforeReload)

      // 7. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeReload)

      // 8. Verify loan still visible in loans page
      await loansPage.navigateTo('loans')
      await expect(loansPage.getLoanByPersonName('Offline No Sync Loan')).toBeVisible()

      // 9. Verify transaction still in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Offline No Sync Loan')).toBeVisible()
    })
  })
}
