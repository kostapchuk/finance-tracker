import type { Page } from '@playwright/test'
import { test, expect } from '../fixtures/test-base'
import { LoanForm } from '../page-objects/components/loan-form'
import { PaymentDialog } from '../page-objects/components/payment-dialog'
import { testAccounts } from '../fixtures/test-data'
import { expectLedgerConsistent } from '../helpers/loan-ledger.helper'

// Every scenario ends by checking the full ledger invariant (account balances,
// paidAmount and status all agree with the stored transactions), so a state
// that "looks right" on one number but drifts on another is caught.

test.describe('Loan ledger consistency', () => {
  test.beforeEach(async ({ setupCleanState, page }) => {
    await setupCleanState()
    // Deleting asks for confirmation through window.confirm
    page.on('dialog', (dialog) => dialog.accept())
  })

  const deleteLoanFromDialog = async (page: Page) => {
    await new PaymentDialog(page).deleteLoan()
    await page.waitForTimeout(500)
  }

  test('given loan: create, pay twice, delete loan - balance returns to opening', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Ann')
    await loanForm.fillAmount('500')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()
    await expectLedgerConsistent(dbHelper, opening)

    for (const amount of ['100', '150']) {
      await loansPage.clickLoan('Ann')
      await paymentDialog.fillAmount(amount)
      await paymentDialog.recordPayment()
      await expectLedgerConsistent(dbHelper, opening)
    }
    expect(await dbHelper.getAccountBalance(accountId)).toBe(750)

    await loansPage.clickLoan('Ann')
    await deleteLoanFromDialog(page)

    expect(await dbHelper.getAccountBalance(accountId)).toBe(1000)
    expect(await dbHelper.getTransactionCount()).toBe(0)
    expect(await dbHelper.getAllRecords('loans')).toHaveLength(0)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('received loan: create, pay, delete loan - balance returns to opening', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('received')
    await loanForm.fillPersonName('Bob')
    await loanForm.fillAmount('400')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()
    expect(await dbHelper.getAccountBalance(accountId)).toBe(1400)

    await loansPage.clickLoan('Bob')
    await paymentDialog.fillAmount('150')
    await paymentDialog.recordPayment()
    expect(await dbHelper.getAccountBalance(accountId)).toBe(1250)
    await expectLedgerConsistent(dbHelper, opening)

    await loansPage.clickLoan('Bob')
    await deleteLoanFromDialog(page)

    expect(await dbHelper.getAccountBalance(accountId)).toBe(1000)
    expect(await dbHelper.getTransactionCount()).toBe(0)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('fully paying a loan keeps the ledger consistent, and the completed loan can be deleted', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Cleo')
    await loanForm.fillAmount('300')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()

    await loansPage.clickLoan('Cleo')
    await paymentDialog.payRemaining()

    expect((await dbHelper.getLoanStatus(1))?.status).toBe('fully_paid')
    expect(await dbHelper.getAccountBalance(accountId)).toBe(1000)
    await expectLedgerConsistent(dbHelper, opening)

    // Completed loans are still openable, and can be deleted
    await loansPage.getCompletedLoans().first().click()
    await deleteLoanFromDialog(page)

    expect(await dbHelper.getAccountBalance(accountId)).toBe(1000)
    expect(await dbHelper.getTransactionCount()).toBe(0)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('multi-currency: EUR loan on USD account, pay, delete - exact USD restored', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Pierre')
    await loanForm.fillAmount('200')
    await loanForm.selectCurrency('EUR')
    await loanForm.selectAccount('USD Cash')
    await loanForm.fillAccountAmount('220')
    await loanForm.save()
    expect(await dbHelper.getAccountBalance(accountId)).toBe(780)
    await expectLedgerConsistent(dbHelper, opening)

    // Payment is tracked in EUR on the loan but moves USD on the account,
    // at a different rate than the loan was issued at.
    await loansPage.clickLoan('Pierre')
    await paymentDialog.fillAmount('50')
    await paymentDialog.fillAccountAmount('58')
    await paymentDialog.recordPayment()

    expect(await dbHelper.getAccountBalance(accountId)).toBe(838)
    expect((await dbHelper.getLoanStatus(1))?.paidAmount).toBe(50)
    await expectLedgerConsistent(dbHelper, opening)

    await loansPage.clickLoan('Pierre')
    await deleteLoanFromDialog(page)

    expect(await dbHelper.getAccountBalance(accountId)).toBe(1000)
    expect(await dbHelper.getTransactionCount()).toBe(0)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('three currencies: BTC loan paid from EUR account (main USD), delete restores EUR', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.eurBank())
    await dbHelper.seedLoan({
      type: 'given',
      personName: 'Satoshi',
      description: '',
      amount: 0.1,
      currency: 'BTC',
      paidAmount: 0,
      status: 'active',
      accountId,
    })
    await dbHelper.seedTransaction({
      type: 'loan_given',
      amount: 5000,
      currency: 'EUR',
      accountId,
      loanId: 1,
      comment: 'Satoshi loan',
    })
    await dbHelper.updateAccountBalance(accountId, 2000 - 5000)
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 2000 }
    const paymentDialog = new PaymentDialog(page)
    await expectLedgerConsistent(dbHelper, opening)

    await loansPage.navigateTo('loans')
    await loansPage.clickLoan('Satoshi')
    await paymentDialog.fillAmount('0.05')
    await paymentDialog.fillAccountAmount('3000')
    await paymentDialog.fillMainCurrencyAmount('3300')
    await paymentDialog.recordPayment()

    expect(await dbHelper.getAccountBalance(accountId)).toBe(0)
    expect((await dbHelper.getLoanStatus(1))?.paidAmount).toBe(0.05)
    await expectLedgerConsistent(dbHelper, opening)

    await loansPage.clickLoan('Satoshi')
    await deleteLoanFromDialog(page)

    expect(await dbHelper.getAccountBalance(accountId)).toBe(2000)
    expect(await dbHelper.getTransactionCount()).toBe(0)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('editing a payment amount in History re-balances account and paidAmount', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Dina')
    await loanForm.fillAmount('500')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()

    await loansPage.clickLoan('Dina')
    await paymentDialog.fillAmount('100')
    await paymentDialog.recordPayment()
    expect(await dbHelper.getAccountBalance(accountId)).toBe(600)

    await historyPage.navigateTo('history')
    await historyPage.clickTransactionByComment('Payment received from Dina')
    await paymentDialog.fillAmount('250')
    await paymentDialog.recordPayment()

    expect(await dbHelper.getAccountBalance(accountId)).toBe(750)
    expect((await dbHelper.getLoanStatus(1))?.paidAmount).toBe(250)
    expect((await dbHelper.getLoanStatus(1))?.status).toBe('partially_paid')
    await expectLedgerConsistent(dbHelper, opening)

    // Raising it to the full amount must flip the status too
    await historyPage.clickTransactionByComment('Payment received from Dina')
    await paymentDialog.fillAmount('500')
    await paymentDialog.recordPayment()

    expect(await dbHelper.getAccountBalance(accountId)).toBe(1000)
    expect((await dbHelper.getLoanStatus(1))?.status).toBe('fully_paid')
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('editing a multi-currency payment re-balances using the account amount', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('received')
    await loanForm.fillPersonName('Elena')
    await loanForm.fillAmount('200')
    await loanForm.selectCurrency('EUR')
    await loanForm.selectAccount('USD Cash')
    await loanForm.fillAccountAmount('220')
    await loanForm.save()
    expect(await dbHelper.getAccountBalance(accountId)).toBe(1220)

    await loansPage.clickLoan('Elena')
    await paymentDialog.fillAmount('50')
    await paymentDialog.fillAccountAmount('55')
    await paymentDialog.recordPayment()
    expect(await dbHelper.getAccountBalance(accountId)).toBe(1165)
    await expectLedgerConsistent(dbHelper, opening)

    await historyPage.navigateTo('history')
    await historyPage.clickTransactionByComment('Payment made to Elena')
    await paymentDialog.fillAmount('80')
    await paymentDialog.fillAccountAmount('92')
    await paymentDialog.recordPayment()

    expect(await dbHelper.getAccountBalance(accountId)).toBe(1128)
    expect((await dbHelper.getLoanStatus(1))?.paidAmount).toBe(80)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('moving a payment to another account moves the money between both balances', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const usdId = await dbHelper.seedAccount(testAccounts.usdCash())
    const secondUsdId = await dbHelper.seedAccount({
      ...testAccounts.usdCash(),
      name: 'USD Savings',
      balance: 300,
      sortOrder: 5,
    })
    await dbHelper.refreshStoreData()
    const opening = { [usdId]: 1000, [secondUsdId]: 300 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Farid')
    await loanForm.fillAmount('400')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()

    await loansPage.clickLoan('Farid')
    await paymentDialog.fillAmount('100')
    await paymentDialog.recordPayment()
    expect(await dbHelper.getAccountBalance(usdId)).toBe(700)

    await historyPage.navigateTo('history')
    await historyPage.clickTransactionByComment('Payment received from Farid')
    await paymentDialog.selectAccount('USD Savings')
    await paymentDialog.recordPayment()

    expect(await dbHelper.getAccountBalance(usdId)).toBe(600)
    expect(await dbHelper.getAccountBalance(secondUsdId)).toBe(400)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('editing a loan after a partial payment keeps paidAmount, status and balances consistent', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Gita')
    await loanForm.fillAmount('500')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()

    await loansPage.clickLoan('Gita')
    await paymentDialog.fillAmount('200')
    await paymentDialog.recordPayment()
    expect(await dbHelper.getAccountBalance(accountId)).toBe(700)

    await historyPage.navigateTo('history')
    await historyPage.filterByType('loans')
    await historyPage.clickTransactionByComment('Loan to Gita')
    await loanForm.fillAmount('800')
    await loanForm.save()

    // 1000 - 800 given + 200 repaid
    expect(await dbHelper.getAccountBalance(accountId)).toBe(400)
    const loan = await dbHelper.getLoanStatus(1)
    expect(loan?.paidAmount).toBe(200)
    expect(loan?.status).toBe('partially_paid')
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('lowering a loan to exactly what was already repaid marks it fully paid', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Hugo')
    await loanForm.fillAmount('500')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()

    await loansPage.clickLoan('Hugo')
    await paymentDialog.fillAmount('200')
    await paymentDialog.recordPayment()

    await historyPage.navigateTo('history')
    await historyPage.filterByType('loans')
    await historyPage.clickTransactionByComment('Loan to Hugo')
    await loanForm.fillAmount('200')
    await loanForm.save()

    // Nothing is owed any more, so the loan must not stay "partially paid"
    expect((await dbHelper.getLoanStatus(1))?.status).toBe('fully_paid')
    expect(await dbHelper.getAccountBalance(accountId)).toBe(1000)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('deleting a single payment from History keeps the loan and restores its progress', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Ivan')
    await loanForm.fillAmount('500')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()

    await loansPage.clickLoan('Ivan')
    await paymentDialog.fillAmount('500')
    await paymentDialog.recordPayment()
    expect((await dbHelper.getLoanStatus(1))?.status).toBe('fully_paid')

    await historyPage.navigateTo('history')
    await historyPage.clickTransactionByComment('Payment received from Ivan')
    await deleteLoanFromDialog(page)

    // Only the payment is gone: the loan is back to active and the money is out again
    expect(await dbHelper.getAllRecords('loans')).toHaveLength(1)
    expect(await dbHelper.getTransactionCount()).toBe(1)
    expect(await dbHelper.getLoanStatus(1)).toEqual({ paidAmount: 0, status: 'active' })
    expect(await dbHelper.getAccountBalance(accountId)).toBe(500)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('deleting a multi-currency payment restores the exact account-currency amount', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('received')
    await loanForm.fillPersonName('Jana')
    await loanForm.fillAmount('200')
    await loanForm.selectCurrency('EUR')
    await loanForm.selectAccount('USD Cash')
    await loanForm.fillAccountAmount('220')
    await loanForm.save()

    await loansPage.clickLoan('Jana')
    await paymentDialog.fillAmount('50')
    await paymentDialog.fillAccountAmount('57')
    await paymentDialog.recordPayment()
    expect(await dbHelper.getAccountBalance(accountId)).toBe(1163)

    await historyPage.navigateTo('history')
    await historyPage.clickTransactionByComment('Payment made to Jana')
    await deleteLoanFromDialog(page)

    expect(await dbHelper.getAccountBalance(accountId)).toBe(1220)
    expect(await dbHelper.getLoanStatus(1)).toEqual({ paidAmount: 0, status: 'active' })
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('the loan type cannot be changed once the loan exists', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Kai')
    await loanForm.fillAmount('500')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()

    await loansPage.clickLoan('Kai')
    await paymentDialog.fillAmount('100')
    await paymentDialog.recordPayment()

    await historyPage.navigateTo('history')
    await historyPage.clickTransactionByComment('Loan to Kai')

    // The selector is locked, and saving other edits keeps the loan a "given" one
    await expect(loanForm.getDialog().locator('button.w-full.border').first()).toBeDisabled()
    await loanForm.fillAmount('600')
    await loanForm.save()

    const [loan] = await dbHelper.getAllRecords<{ type: string }>('loans')
    expect(loan.type).toBe('given')
    expect(await dbHelper.getAccountBalance(accountId)).toBe(500)
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('a loan with payments keeps its currency and cannot drop below the repaid amount', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const opening = { [accountId]: 1000 }
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Lena')
    await loanForm.fillAmount('500')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()

    await loansPage.clickLoan('Lena')
    await paymentDialog.fillAmount('200')
    await paymentDialog.recordPayment()

    await historyPage.navigateTo('history')
    await historyPage.clickTransactionByComment('Loan to Lena')

    // Currency is locked; the principal can't go below the 200 already repaid
    await expect(loanForm.getDialog().locator('#currency')).toBeDisabled()
    await loanForm.fillAmount('150')
    await loanForm.save()
    await expect(loanForm.getDialog()).toBeVisible()
    expect((await dbHelper.getAllRecords<{ amount: number }>('loans'))[0].amount).toBe(500)
    expect(await dbHelper.getAccountBalance(accountId)).toBe(700)

    // Exactly the repaid amount is fine
    await loanForm.fillAmount('200')
    await loanForm.save()
    expect(await dbHelper.getLoanStatus(1)).toEqual({ paidAmount: 200, status: 'fully_paid' })
    await expectLedgerConsistent(dbHelper, opening)
  })

  test('an account used by loans and payments cannot be deleted until the loans are gone', async ({
    page,
    loansPage,
    settingsPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    const loanForm = new LoanForm(page)
    const paymentDialog = new PaymentDialog(page)

    await loansPage.navigateTo('loans')
    await loansPage.clickAdd()
    await loanForm.selectType('given')
    await loanForm.fillPersonName('Mila')
    await loanForm.fillAmount('300')
    await loanForm.selectAccount('USD Cash')
    await loanForm.save()
    await loansPage.clickLoan('Mila')
    await paymentDialog.fillAmount('100')
    await paymentDialog.recordPayment()

    await settingsPage.navigateTo('settings')
    await settingsPage.openSection('accounts')
    await settingsPage.deleteItem('USD Cash')
    await page.waitForTimeout(500)

    // The account is in use by the loan and its payment, so deleting it is refused
    const accounts = await dbHelper.getAllRecords<{ id: number }>('accounts')
    expect(accounts.map((a) => a.id)).toEqual([accountId])
    await expectLedgerConsistent(dbHelper, { [accountId]: 1000 })

    // Once the loan is gone, the account can be deleted
    await loansPage.navigateTo('loans')
    await loansPage.clickLoan('Mila')
    await deleteLoanFromDialog(page)
    await settingsPage.navigateTo('settings')
    await settingsPage.openSection('accounts')
    await settingsPage.deleteItem('USD Cash')
    await page.waitForTimeout(500)
    expect(await dbHelper.getAllRecords('accounts')).toHaveLength(0)
  })
})
