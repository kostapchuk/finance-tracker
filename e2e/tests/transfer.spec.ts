import { test, expect } from '../fixtures/test-base'
import { testAccounts } from '../fixtures/test-data'

test.describe('[sync-disabled] Transfer', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState('sync-disabled')
  })

  test('should create transfer between accounts with same currency', async ({
    page,
    historyPage,
    dbHelper,
    seedAccount,
  }) => {
    const usdCashId = await seedAccount(testAccounts.usdCash())
    const usdBankId = await dbHelper.seedAccount({
      name: 'USD Bank',
      type: 'bank',
      currency: 'USD',
      balance: 500,
      color: '#3b82f6',
      icon: 'landmark',
      sortOrder: 1,
    })

    await dbHelper.seedTransaction({
      type: 'transfer',
      amount: 100,
      currency: 'USD',
      accountId: usdCashId,
      toAccountId: usdBankId,
      date: new Date(),
      comment: 'Same currency transfer',
    })
    await dbHelper.updateAccountBalance(usdCashId, 900)
    await dbHelper.updateAccountBalance(usdBankId, 600)
    await dbHelper.refreshStoreData()
    await page.reload()
    await page.waitForLoadState('networkidle')

    await historyPage.navigateTo('history')

    await expect(page.locator('text=Same currency transfer')).toBeVisible()

    const cashBalance = await dbHelper.getAccountBalance(usdCashId)
    const bankBalance = await dbHelper.getAccountBalance(usdBankId)

    expect(cashBalance).toBe(900)
    expect(bankBalance).toBe(600)
  })

  test('should create transfer between accounts with different currencies', async ({
    page,
    historyPage,
    dbHelper,
    seedAccount,
  }) => {
    const usdAccountId = await seedAccount(testAccounts.usdCash())
    const eurAccountId = await seedAccount(testAccounts.eurBank())

    await dbHelper.seedTransaction({
      type: 'transfer',
      amount: 100,
      currency: 'USD',
      accountId: usdAccountId,
      toAccountId: eurAccountId,
      toAmount: 90,
      date: new Date(),
      comment: 'Multi-currency transfer',
    })
    await dbHelper.updateAccountBalance(usdAccountId, 900)
    await dbHelper.updateAccountBalance(eurAccountId, 2090)
    await dbHelper.refreshStoreData()
    await page.reload()
    await page.waitForLoadState('networkidle')

    await historyPage.navigateTo('history')

    await expect(page.locator('text=Multi-currency transfer')).toBeVisible()

    const usdBalance = await dbHelper.getAccountBalance(usdAccountId)
    const eurBalance = await dbHelper.getAccountBalance(eurAccountId)

    expect(usdBalance).toBe(900)
    expect(eurBalance).toBe(2090)
  })

  test('should edit transfer and update both account balances', async ({
    page,
    historyPage,
    dbHelper,
    seedAccount,
  }) => {
    const usdAccountId = await seedAccount(testAccounts.usdCash())
    const eurAccountId = await seedAccount(testAccounts.eurBank())

    await dbHelper.seedTransaction({
      type: 'transfer',
      amount: 100,
      currency: 'USD',
      accountId: usdAccountId,
      toAccountId: eurAccountId,
      toAmount: 90,
      date: new Date(),
      comment: 'Initial transfer',
    })
    await dbHelper.updateAccountBalance(usdAccountId, 900)
    await dbHelper.updateAccountBalance(eurAccountId, 2090)
    await dbHelper.refreshStoreData()
    await page.reload()
    await page.waitForLoadState('networkidle')

    await historyPage.navigateTo('history')
    await historyPage.filterByType('transfers')
    await historyPage.clickTransactionByComment('Initial transfer')
    await page.waitForTimeout(300)

    const amountInputs = page.locator('input[inputmode="decimal"]')
    await amountInputs.first().fill('150')
    await amountInputs.nth(1).fill('135')

    await page
      .locator('button')
      .filter({ hasText: /update|обновить/i })
      .click()
    await page.waitForTimeout(500)

    const usdBalance = await dbHelper.getAccountBalance(usdAccountId)
    const eurBalance = await dbHelper.getAccountBalance(eurAccountId)

    expect(usdBalance).toBe(850)
    expect(eurBalance).toBe(2135)
  })

  test('should delete transfer and reverse both account balances', async ({
    page,
    historyPage,
    dbHelper,
    seedAccount,
  }) => {
    const usdAccountId = await seedAccount(testAccounts.usdCash())
    const eurAccountId = await seedAccount(testAccounts.eurBank())

    await dbHelper.seedTransaction({
      type: 'transfer',
      amount: 200,
      currency: 'USD',
      accountId: usdAccountId,
      toAccountId: eurAccountId,
      toAmount: 180,
      date: new Date(),
      comment: 'Transfer to delete',
    })
    await dbHelper.updateAccountBalance(usdAccountId, 800)
    await dbHelper.updateAccountBalance(eurAccountId, 2180)
    await dbHelper.refreshStoreData()
    await page.reload()
    await page.waitForLoadState('networkidle')

    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })

    await historyPage.navigateTo('history')
    await historyPage.filterByType('transfers')
    await historyPage.clickTransactionByComment('Transfer to delete')
    await page.waitForTimeout(300)

    await page
      .locator('button')
      .filter({ has: page.locator('.lucide-trash-2') })
      .click()
    await page.waitForTimeout(500)

    const usdBalance = await dbHelper.getAccountBalance(usdAccountId)
    const eurBalance = await dbHelper.getAccountBalance(eurAccountId)

    expect(usdBalance).toBe(1000)
    expect(eurBalance).toBe(2000)
  })

  test('should show transfer with correct amounts in history', async ({
    page,
    historyPage,
    dbHelper,
    seedAccount,
  }) => {
    const usdAccountId = await seedAccount(testAccounts.usdCash())
    const eurAccountId = await seedAccount(testAccounts.eurBank())

    await dbHelper.seedTransaction({
      type: 'transfer',
      amount: 250,
      currency: 'USD',
      accountId: usdAccountId,
      toAccountId: eurAccountId,
      toAmount: 225,
      date: new Date(),
      comment: 'Display test transfer',
    })
    await dbHelper.updateAccountBalance(usdAccountId, 750)
    await dbHelper.updateAccountBalance(eurAccountId, 2225)
    await dbHelper.refreshStoreData()
    await page.reload()
    await page.waitForLoadState('networkidle')

    await historyPage.navigateTo('history')

    await expect(page.locator('text=Display test transfer')).toBeVisible()

    const historyItem = page.locator('text=/250|225/')
    await expect(historyItem.first()).toBeVisible()
  })
})
