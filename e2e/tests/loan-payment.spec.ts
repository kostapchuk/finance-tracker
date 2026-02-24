import { test, expect, type SyncMode } from '../fixtures/test-base'
import { LoanForm } from '../page-objects/components/loan-form'
import { PaymentDialog } from '../page-objects/components/payment-dialog'
import { testAccounts } from '../fixtures/test-data'

const syncModes: SyncMode[] = [
  'sync-disabled',
  'sync-disabled-offline',
  'sync-enabled-online',
  'sync-enabled-offline',
]

for (const mode of syncModes) {
  test.describe(`[${mode}] Loan Payments`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should record partial payment on loan given - balance increases', async ({
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
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('John')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // 1. Verify loan creation decreased balance
      let balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 500)

      // 2. Verify loan appears in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('John')).toBeVisible()

      // Record payment
      await loansPage.navigateTo('loans')
      await loansPage.clickLoan('John')
      await paymentDialog.fillAmount('200')
      await paymentDialog.recordPayment()

      // 3. Verify payment increased balance
      balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 500 + 200)

      // 4. Verify loan status
      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(2) // 1 loan creation + 1 payment

      // 5. Verify payment appears in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from John')).toBeVisible()

      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(200)
      expect(loanStatus?.status).toBe('partially_paid')

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBeGreaterThanOrEqual(2)
      }
    })

    test('should record partial payment on loan received - balance decreases', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('received')
      await loanForm.fillPersonName('Jane')
      await loanForm.fillAmount('1000')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // 1. Verify loan creation increased balance
      let balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance + 1000)

      // 2. Verify loan appears in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(historyPage.getTransactionByTitle('Jane')).toBeVisible()

      // Record payment
      await loansPage.navigateTo('loans')
      await loansPage.clickLoan('Jane')
      await paymentDialog.fillAmount('300')
      await paymentDialog.recordPayment()

      // 3. Verify payment decreased balance
      balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance + 1000 - 300)

      // 4. Verify payment appears in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment to Jane')).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans.length).toBe(1)
      }
    })

    test('should record full payment - loan status becomes fully_paid', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Full Payment Test')
      await loanForm.fillAmount('300')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // Record full payment
      await loansPage.clickLoan('Full Payment Test')
      await paymentDialog.fillAmount('300')
      await paymentDialog.recordPayment()

      // 1. Verify loan status
      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(300)
      expect(loanStatus?.status).toBe('fully_paid')

      // 2. Verify completed section visible
      await expect(loansPage.getCompletedSection()).toBeVisible()

      // 3. Verify payment in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from Full Payment Test')).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].status).toBe('fully_paid')
      }
    })

    test('should use pay remaining button for full payment', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Pay Remaining Test')
      await loanForm.fillAmount('400')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // Pay remaining
      await loansPage.clickLoan('Pay Remaining Test')
      await paymentDialog.payRemaining()

      // 1. Verify balance restored
      const balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 400 + 400)

      // 2. Verify loan status
      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.status).toBe('fully_paid')

      // 3. Verify payment in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from Pay Remaining Test')).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].status).toBe('fully_paid')
      }
    })

    test('should record multi-currency payment (EUR loan, USD account)', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create multi-currency loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('EUR Payment Test')
      await loanForm.fillAmount('200')
      await loanForm.selectCurrency('EUR')
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAccountAmount('220')
      await loanForm.save()

      // 1. Verify loan creation decreased balance
      let balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 220)

      // 2. Record payment
      await loansPage.clickLoan('EUR Payment Test')
      await paymentDialog.fillAmount('100')
      await paymentDialog.fillAccountAmount('110')
      await paymentDialog.recordPayment()

      // 3. Verify payment increased balance
      balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 220 + 110)

      // 4. Verify payment in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from EUR Payment Test')).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].currency).toBe('EUR')
      }
    })

    test('should record multiple payments on same loan', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Multiple Payments')
      await loanForm.fillAmount('600')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // First payment
      await loansPage.clickLoan('Multiple Payments')
      await paymentDialog.fillAmount('200')
      await paymentDialog.recordPayment()

      // Second payment
      await loansPage.clickLoan('Multiple Payments')
      await paymentDialog.fillAmount('150')
      await paymentDialog.recordPayment()

      // 1. Verify loan status
      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(350)
      expect(loanStatus?.status).toBe('partially_paid')

      // 2. Verify balance
      const balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 600 + 350)

      // 3. Verify both payments in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      const paymentCount = await page
        .locator('text=Payment received from Multiple Payments')
        .count()
      expect(paymentCount).toBe(2)

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBeGreaterThanOrEqual(3)
      }
    })

    test('should show payment in transaction history', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('History Test')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // Record payment
      await loansPage.clickLoan('History Test')
      await paymentDialog.fillAmount('100')
      await paymentDialog.recordPayment()

      // 1. Verify payment in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from History Test')).toBeVisible()

      // 2. Verify transaction count
      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(2) // 1 loan + 1 payment

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should record payment to different account than loan account', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const usdAccountId = await seedAccount(testAccounts.usdCash())
      const eurAccountId = await seedAccount(testAccounts.eurBank())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialUsdBalance = await dbHelper.getAccountBalance(usdAccountId)
      const initialEurBalance = await dbHelper.getAccountBalance(eurAccountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan in USD account
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Different Account Test')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // Verify loan decreased USD balance
      let usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      expect(usdBalance).toBe(initialUsdBalance - 500)

      let eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(eurBalance).toBe(initialEurBalance)

      // Record payment to EUR account
      await loansPage.clickLoan('Different Account Test')
      await paymentDialog.selectAccount('EUR Bank')
      await paymentDialog.fillAmount('200')
      await paymentDialog.fillAccountAmount('180')
      await paymentDialog.recordPayment()

      // 1. Verify USD balance unchanged
      usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      expect(usdBalance).toBe(initialUsdBalance - 500)

      // 2. Verify EUR balance increased
      eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(eurBalance).toBe(initialEurBalance + 180)

      // 3. Verify loan status
      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(200)
      expect(loanStatus?.status).toBe('partially_paid')

      // 4. Verify payment in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from Different Account Test')).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should record payment to different account with same currency', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const cashAccountId = await seedAccount(testAccounts.usdCash())
      const creditAccountId = await seedAccount(testAccounts.creditCard())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialCashBalance = await dbHelper.getAccountBalance(cashAccountId)
      const initialCreditBalance = await dbHelper.getAccountBalance(creditAccountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Same Currency Different Account')
      await loanForm.fillAmount('300')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // Verify loan decreased cash balance
      let cashBalance = await dbHelper.getAccountBalance(cashAccountId)
      expect(cashBalance).toBe(initialCashBalance - 300)

      // Record payment to credit card
      await loansPage.clickLoan('Same Currency Different Account')
      await paymentDialog.selectAccount('Credit Card')
      await paymentDialog.fillAmount('150')
      await paymentDialog.recordPayment()

      // 1. Verify cash balance unchanged
      cashBalance = await dbHelper.getAccountBalance(cashAccountId)
      expect(cashBalance).toBe(initialCashBalance - 300)

      // 2. Verify credit balance increased
      const creditBalance = await dbHelper.getAccountBalance(creditAccountId)
      expect(creditBalance).toBe(initialCreditBalance + 150)

      // 3. Verify loan status
      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(150)

      // 4. Verify payment in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(
        page.locator('text=Payment received from Same Currency Different Account')
      ).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should persist payment after offline and back online', async ({
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
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Offline Payment Test')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // Record payment
      await loansPage.clickLoan('Offline Payment Test')
      await paymentDialog.fillAmount('200')
      await paymentDialog.recordPayment()

      // 1. Capture state before going online
      const balanceBeforeOnline = await dbHelper.getAccountBalance(accountId)
      const txCountBeforeOnline = await dbHelper.getTransactionCount()
      const loanStatusBeforeOnline = await dbHelper.getLoanStatus(1)

      // 2. Verify sync queue has pending items
      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      // 3. Verify payment in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from Offline Payment Test')).toBeVisible()

      // 4. Go online and verify sync completes
      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      // 5. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 6. Verify balance unchanged after reload
      const balanceAfterReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterReload).toBe(balanceBeforeOnline)

      // 7. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeOnline)

      // 8. Verify loan status unchanged
      const loanStatusAfterReload = await dbHelper.getLoanStatus(1)
      expect(loanStatusAfterReload?.paidAmount).toBe(loanStatusBeforeOnline?.paidAmount)
      expect(loanStatusAfterReload?.status).toBe(loanStatusBeforeOnline?.status)

      // 9. Verify loan still visible
      await loansPage.navigateTo('loans')
      await expect(loansPage.getLoanByPersonName('Offline Payment Test')).toBeVisible()

      // 10. Verify payment still in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from Offline Payment Test')).toBeVisible()

      // 11. Verify remote data
      const remoteTransactions = syncHelper.getMockRemoteData('transactions')
      expect(remoteTransactions.length).toBeGreaterThanOrEqual(2)

      const remoteLoans = syncHelper.getMockRemoteData('loans')
      expect(remoteLoans[0].paidAmount).toBe(200)
    })

    test('should persist payment in offline mode without sync', async ({
      page,
      loansPage,
      historyPage,
      dbHelper,
      seedAccount,
    }) => {
      if (mode !== 'sync-disabled-offline') {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      // Create loan
      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Offline No Sync Payment')
      await loanForm.fillAmount('400')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      // Record payment
      await loansPage.clickLoan('Offline No Sync Payment')
      await paymentDialog.fillAmount('150')
      await paymentDialog.recordPayment()

      // 1. Capture state before reload
      const balanceBeforeReload = await dbHelper.getAccountBalance(accountId)
      const txCountBeforeReload = await dbHelper.getTransactionCount()
      const loanStatusBeforeReload = await dbHelper.getLoanStatus(1)

      // 2. Verify payment in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from Offline No Sync Payment')).toBeVisible()

      // 3. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 4. Verify balance unchanged after reload
      const balanceAfterReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterReload).toBe(balanceBeforeReload)

      // 5. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeReload)

      // 6. Verify loan status unchanged
      const loanStatusAfterReload = await dbHelper.getLoanStatus(1)
      expect(loanStatusAfterReload?.paidAmount).toBe(loanStatusBeforeReload?.paidAmount)

      // 7. Verify loan still visible
      await loansPage.navigateTo('loans')
      await expect(loansPage.getLoanByPersonName('Offline No Sync Payment')).toBeVisible()

      // 8. Verify payment still in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')
      await expect(page.locator('text=Payment received from Offline No Sync Payment')).toBeVisible()
    })
  })
}
