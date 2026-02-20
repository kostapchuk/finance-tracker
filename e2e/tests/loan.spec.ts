import { test, expect, type SyncMode } from '../fixtures/test-base'
import { LoanForm } from '../page-objects/components/loan-form'
import { testAccounts } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] Loan Management`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should create a loan given (money lent out) - account balance decreases', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('John Doe')
      await loanForm.fillDescription('Vacation loan')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await expect(loansPage.getLoanByPersonName('John Doe')).toBeVisible()

      const newBalance = await dbHelper.getAccountBalance(accountId)
      expect(newBalance).toBe(initialBalance - 500)

      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(1)

      if (mode !== 'sync-disabled') {
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

      await loanForm.selectType('received')
      await loanForm.fillPersonName('Jane Smith')
      await loanForm.fillDescription('Personal loan')
      await loanForm.fillAmount('1000')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await expect(loansPage.getLoanByPersonName('Jane Smith')).toBeVisible()

      const newBalance = await dbHelper.getAccountBalance(accountId)
      expect(newBalance).toBe(initialBalance + 1000)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans.length).toBe(1)
        expect(remoteLoans[0].type).toBe('received')
      }
    })

    test('should create multi-currency loan (EUR loan, USD account)', async ({
      page,
      loansPage,
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

      const newBalance = await dbHelper.getAccountBalance(accountId)
      expect(newBalance).toBe(initialBalance - 220)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].currency).toBe('EUR')
      }
    })

    test('should set due date for loan', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('Bob')
      await loanForm.fillAmount('300')
      await loanForm.setDueDate('2025-06-15')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await expect(loansPage.getLoanByPersonName('Bob')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].dueDate).toBeDefined()
      }
    })

    test('should show loan summary amounts correctly', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Person A')
      await loanForm.fillAmount('1000')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await loansPage.clickAdd()
      await loanForm.selectType('received')
      await loanForm.fillPersonName('Person B')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await expect(loansPage.getOwedToYouAmount()).toContainText('1,000')
      await expect(loansPage.getYouOweAmount()).toContainText('500')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans.length).toBe(2)
      }
    })

    test('should persist loan after offline and back online', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      if (mode !== 'sync-enabled-offline') {
        test.skip()
        return
      }

      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()

      const loanForm = new LoanForm(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()

      await loanForm.selectType('given')
      await loanForm.fillPersonName('Offline Loan')
      await loanForm.fillAmount('750')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await expect(loansPage.getLoanByPersonName('Offline Loan')).toBeVisible()

      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      const remoteLoans = syncHelper.getMockRemoteData('loans')
      expect(remoteLoans.length).toBe(1)
      expect(remoteLoans[0].personName).toBe('Offline Loan')
    })
  })
}
