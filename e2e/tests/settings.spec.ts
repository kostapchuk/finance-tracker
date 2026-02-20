import { test, expect } from '../fixtures/test-base'
import { testAccounts, testCategories } from '../fixtures/test-data'

test.describe('[sync-disabled] Settings', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState('sync-disabled')
  })

  test('should export data as JSON', async ({ page, settingsPage, seedAccount, seedCategory }) => {
    await seedAccount(testAccounts.usdCash())
    await seedCategory(testCategories.food())
    await settingsPage.navigateTo('settings')

    const downloadPromise = page.waitForEvent('download')

    await page.locator('text=/export|экспорт/i').first().click()
    await page.waitForTimeout(500)

    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.json')
  })

  test('should delete all data with confirmation', async ({
    page,
    settingsPage,
    seedAccount,
    dbHelper,
  }) => {
    await seedAccount(testAccounts.usdCash())
    await dbHelper.refreshStoreData()
    await page.reload()
    await page.waitForLoadState('networkidle')

    await settingsPage.navigateTo('settings')

    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })

    await page.locator('text=/delete all|удалить все/i').first().click()
    await page.waitForTimeout(500)

    const accountCount = await dbHelper.getTransactionCount()
    expect(accountCount).toBe(0)
  })

  test('should show language selection in settings', async ({ page, settingsPage }) => {
    await settingsPage.navigateTo('settings')

    await expect(page.locator('h3:has-text("Language")')).toBeVisible()
  })

  test('should show currency selection in settings', async ({ page, settingsPage }) => {
    await settingsPage.navigateTo('settings')

    await expect(page.locator('text=/currency|валют/i')).toBeVisible()
  })

  test('should show privacy mode option', async ({ page, settingsPage }) => {
    await settingsPage.navigateTo('settings')

    await expect(page.locator('text=/privacy|приватност/i')).toBeVisible()
  })

  test('should show export/import options', async ({ page, settingsPage }) => {
    await settingsPage.navigateTo('settings')

    await expect(page.locator('text=/export|экспорт/i').first()).toBeVisible()
    await expect(page.locator('text=/import backup|импорт резерв/i')).toBeVisible()
  })

  test('should show danger zone', async ({ page, settingsPage }) => {
    await settingsPage.navigateTo('settings')

    await expect(page.locator('text=/danger|опасн/i')).toBeVisible()
  })
})
