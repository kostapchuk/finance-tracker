import { test, expect, type SyncMode } from '../fixtures/test-base'
import { LoanForm } from '../page-objects/components/loan-form'
import { PaymentDialog } from '../page-objects/components/payment-dialog'
import { testAccounts } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] Loan Payments`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should record partial payment on loan given - balance increases', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('John')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      let balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 500)

      await loansPage.clickLoan('John')

      await paymentDialog.fillAmount('200')
      await paymentDialog.recordPayment()

      balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 500 + 200)

      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(200)
      expect(loanStatus?.status).toBe('partially_paid')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBeGreaterThanOrEqual(2)
      }
    })

    test('should record partial payment on loan received - balance decreases', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('received')
      await loanForm.fillPersonName('Jane')
      await loanForm.fillAmount('1000')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      let balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance + 1000)

      await loansPage.clickLoan('Jane')

      await paymentDialog.fillAmount('300')
      await paymentDialog.recordPayment()

      balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance + 1000 - 300)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans.length).toBe(1)
      }
    })

    test('should record full payment - loan status becomes fully_paid', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Full Payment Test')
      await loanForm.fillAmount('300')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await loansPage.clickLoan('Full Payment Test')

      await paymentDialog.fillAmount('300')
      await paymentDialog.recordPayment()

      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(300)
      expect(loanStatus?.status).toBe('fully_paid')

      await expect(loansPage.getCompletedSection()).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].status).toBe('fully_paid')
      }
    })

    test('should use pay remaining button for full payment', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Pay Remaining Test')
      await loanForm.fillAmount('400')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await loansPage.clickLoan('Pay Remaining Test')

      await paymentDialog.payRemaining()

      const balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 400 + 400)

      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.status).toBe('fully_paid')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].status).toBe('fully_paid')
      }
    })

    test('should record multi-currency payment (EUR loan, USD account)', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('EUR Payment Test')
      await loanForm.fillAmount('200')
      await loanForm.selectCurrency('EUR')
      await loanForm.selectAccount('USD Cash')
      await loanForm.fillAccountAmount('220')
      await loanForm.save()

      let balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 220)

      await loansPage.clickLoan('EUR Payment Test')

      await paymentDialog.fillAmount('100')
      await paymentDialog.fillAccountAmount('110')

      await paymentDialog.recordPayment()

      balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 220 + 110)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteLoans = syncHelper.getMockRemoteData('loans')
        expect(remoteLoans[0].currency).toBe('EUR')
      }
    })

    test('should record multiple payments on same loan', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialBalance = await dbHelper.getAccountBalance(accountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Multiple Payments')
      await loanForm.fillAmount('600')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await loansPage.clickLoan('Multiple Payments')
      await paymentDialog.fillAmount('200')
      await paymentDialog.recordPayment()

      await loansPage.clickLoan('Multiple Payments')
      await paymentDialog.fillAmount('150')
      await paymentDialog.recordPayment()

      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(350)
      expect(loanStatus?.status).toBe('partially_paid')

      const balance = await dbHelper.getAccountBalance(accountId)
      expect(balance).toBe(initialBalance - 600 + 350)

      if (mode !== 'sync-disabled') {
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
    }) => {
      await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('History Test')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await loansPage.clickLoan('History Test')
      await paymentDialog.fillAmount('100')
      await paymentDialog.recordPayment()

      await historyPage.navigateTo('history')
      await historyPage.filterByType('loans')

      await expect(page.locator('text=Payment received from History Test')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should record payment to different account than loan account', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      const usdAccountId = await seedAccount(testAccounts.usdCash())
      const eurAccountId = await seedAccount(testAccounts.eurBank())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialUsdBalance = await dbHelper.getAccountBalance(usdAccountId)
      const initialEurBalance = await dbHelper.getAccountBalance(eurAccountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Different Account Test')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      let usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      expect(usdBalance).toBe(initialUsdBalance - 500)

      let eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(eurBalance).toBe(initialEurBalance)

      await loansPage.clickLoan('Different Account Test')

      await paymentDialog.selectAccount('EUR Bank')

      await paymentDialog.fillAmount('200')
      await paymentDialog.fillAccountAmount('180')

      await paymentDialog.recordPayment()

      usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      expect(usdBalance).toBe(initialUsdBalance - 500)

      eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(eurBalance).toBe(initialEurBalance + 180)

      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(200)
      expect(loanStatus?.status).toBe('partially_paid')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should record payment to different account with same currency', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      const cashAccountId = await seedAccount(testAccounts.usdCash())
      const creditAccountId = await seedAccount(testAccounts.creditCard())
      await dbHelper.refreshStoreData()
      await page.reload()

      const initialCashBalance = await dbHelper.getAccountBalance(cashAccountId)
      const initialCreditBalance = await dbHelper.getAccountBalance(creditAccountId)
      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Same Currency Different Account')
      await loanForm.fillAmount('300')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      let cashBalance = await dbHelper.getAccountBalance(cashAccountId)
      expect(cashBalance).toBe(initialCashBalance - 300)

      await loansPage.clickLoan('Same Currency Different Account')

      await paymentDialog.selectAccount('Credit Card')

      await paymentDialog.fillAmount('150')

      await paymentDialog.recordPayment()

      cashBalance = await dbHelper.getAccountBalance(cashAccountId)
      expect(cashBalance).toBe(initialCashBalance - 300)

      const creditBalance = await dbHelper.getAccountBalance(creditAccountId)
      expect(creditBalance).toBe(initialCreditBalance + 150)

      const loanStatus = await dbHelper.getLoanStatus(1)
      expect(loanStatus?.paidAmount).toBe(150)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should persist payment after offline and back online', async ({
      page,
      loansPage,
      dbHelper,
      syncHelper,
    }) => {
      if (mode !== 'sync-enabled-offline') {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      await dbHelper.refreshStoreData()
      await page.reload()

      const loanForm = new LoanForm(page)
      const paymentDialog = new PaymentDialog(page)

      await loansPage.navigateTo('loans')
      await loansPage.clickAdd()
      await loanForm.selectType('given')
      await loanForm.fillPersonName('Offline Payment Test')
      await loanForm.fillAmount('500')
      await loanForm.selectAccount('USD Cash')
      await loanForm.save()

      await loansPage.clickLoan('Offline Payment Test')
      await paymentDialog.fillAmount('200')
      await paymentDialog.recordPayment()

      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      const remoteTransactions = syncHelper.getMockRemoteData('transactions')
      expect(remoteTransactions.length).toBeGreaterThanOrEqual(2)

      const remoteLoans = syncHelper.getMockRemoteData('loans')
      expect(remoteLoans[0].paidAmount).toBe(200)
    })
  })
}
