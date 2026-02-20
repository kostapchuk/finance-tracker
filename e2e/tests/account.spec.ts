import { test, expect, type SyncMode } from '../fixtures/test-base'
import { AccountForm } from '../page-objects/components/account-form'
import { testAccounts } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] Account Management`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should create a cash account with USD currency', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const accountForm = new AccountForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('accounts')
      await settingsPage.clickAdd()

      await accountForm.fillName('My Cash Wallet')
      await accountForm.selectType('cash')
      await accountForm.selectCurrency('USD')
      await accountForm.fillBalance('500')
      await accountForm.save()

      await expect(page.locator('text=My Cash Wallet')).toBeVisible()
      await expect(page.locator('text=/500.*\\$/i')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteAccounts = syncHelper.getMockRemoteData('accounts')
        expect(remoteAccounts.length).toBe(1)
        expect(remoteAccounts[0].name).toBe('My Cash Wallet')
      }
    })

    test('should create a bank account with EUR currency', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const accountForm = new AccountForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('accounts')
      await settingsPage.clickAdd()

      await accountForm.fillName('Euro Bank')
      await accountForm.selectType('bank')
      await accountForm.selectCurrency('EUR')
      await accountForm.fillBalance('2000')
      await accountForm.save()

      await expect(page.locator('text=Euro Bank')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteAccounts = syncHelper.getMockRemoteData('accounts')
        expect(remoteAccounts.length).toBe(1)
      }
    })

    test('should create a crypto wallet account', async ({ page, settingsPage, syncHelper }) => {
      const accountForm = new AccountForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('accounts')
      await settingsPage.clickAdd()

      await accountForm.fillName('BTC Holdings')
      await accountForm.selectType('crypto')
      await accountForm.selectCurrency('BTC')
      await accountForm.fillBalance('0.5')
      await accountForm.save()

      await expect(page.locator('text=BTC Holdings')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteAccounts = syncHelper.getMockRemoteData('accounts')
        expect(remoteAccounts.length).toBe(1)
      }
    })

    test('should create a credit card account with negative balance', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const accountForm = new AccountForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('accounts')
      await settingsPage.clickAdd()

      await accountForm.fillName('Visa Card')
      await accountForm.selectType('credit_card')
      await accountForm.selectCurrency('USD')
      await accountForm.fillBalance('-750')
      await accountForm.save()

      await expect(page.locator('text=Visa Card')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteAccounts = syncHelper.getMockRemoteData('accounts')
        expect(remoteAccounts.length).toBe(1)
        expect(remoteAccounts[0].balance).toBe(-750)
      }
    })

    test('should edit existing account name and balance', async ({
      page,
      settingsPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountData = testAccounts.usdCash()
      await seedAccount(accountData)
      await dbHelper.refreshStoreData()

      const accountForm = new AccountForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('accounts')

      await settingsPage.editItem(accountData.name)

      await accountForm.fillName('Updated Cash')
      await accountForm.fillBalance('1500')
      await accountForm.save()

      await expect(page.locator('text=Updated Cash')).toBeVisible()
      await expect(page.locator('text=USD Cash')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteAccounts = syncHelper.getMockRemoteData('accounts')
        expect(remoteAccounts.length).toBe(1)
        expect(remoteAccounts[0].name).toBe('Updated Cash')
        expect(remoteAccounts[0].balance).toBe(1500)
      }
    })

    test('should delete an account', async ({
      page,
      settingsPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountData = testAccounts.usdCash()
      await seedAccount(accountData)
      await dbHelper.refreshStoreData()

      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('accounts')

      await settingsPage.deleteItem(accountData.name)

      await page.waitForTimeout(500)

      await expect(page.locator(`text=${accountData.name}`)).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteAccounts = syncHelper.getMockRemoteData('accounts')
        expect(remoteAccounts.length).toBe(0)
      }
    })

    test('should show account on dashboard after creation', async ({
      page,
      settingsPage,
      dashboardPage,
      syncHelper,
    }) => {
      const accountForm = new AccountForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('accounts')
      await settingsPage.clickAdd()

      await accountForm.fillName('Dashboard Test')
      await accountForm.selectType('bank')
      await accountForm.selectCurrency('USD')
      await accountForm.fillBalance('100')
      await accountForm.save()

      await dashboardPage.navigateTo('dashboard')

      await expect(dashboardPage.getAccountByName('Dashboard Test')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteAccounts = syncHelper.getMockRemoteData('accounts')
        expect(remoteAccounts.length).toBe(1)
      }
    })

    test('should queue operations when offline and sync when back online', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      if (mode !== 'sync-enabled-offline') {
        test.skip()
        return
      }

      const accountForm = new AccountForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('accounts')
      await settingsPage.clickAdd()

      await accountForm.fillName('First Account')
      await accountForm.selectType('cash')
      await accountForm.selectCurrency('USD')
      await accountForm.fillBalance('1000')
      await accountForm.save()

      await expect(page.locator('text=First Account')).toBeVisible()

      await syncHelper.waitForSyncToComplete()

      const remoteAccountsBefore = syncHelper.getMockRemoteData('accounts')
      expect(remoteAccountsBefore.length).toBe(1)

      await syncHelper.goOffline()
      await page.waitForTimeout(500)

      await page.evaluate(() => {
        localStorage.setItem('test-offline-created', 'true')
      })

      await syncHelper.goOnline()
      await page.waitForTimeout(500)

      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBe(0)

      const remoteAccountsAfter = syncHelper.getMockRemoteData('accounts')
      expect(remoteAccountsAfter.length).toBe(1)
    })
  })
}
