import { test, expect, type SyncMode } from '../fixtures/test-base'

declare global {
  interface Window {
    __TEST_FORCE_SW_UPDATE__?: boolean
  }
}

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] PWA Update Notification`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should not show dot badge on Settings tab when no update is available', async ({
      page,
      syncHelper,
    }) => {
      const settingsButton = page.locator('nav button').filter({ hasText: /settings/i })
      const badge = settingsButton.locator('.rounded-full.bg-primary')
      await expect(badge).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should show dot badge on Settings tab when update is available', async ({
      page,
      syncHelper,
    }) => {
      await page.addInitScript(() => {
        window.__TEST_FORCE_SW_UPDATE__ = true
      })

      const settingsButton = page.locator('nav button').filter({ hasText: /settings/i })
      const badge = settingsButton.locator('.rounded-full.bg-primary')
      await expect(badge).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should show update card in Settings page when update is available', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      await page.addInitScript(() => {
        window.__TEST_FORCE_SW_UPDATE__ = true
      })

      await settingsPage.navigateTo('settings')

      await expect(page.getByText('Update available')).toBeVisible()
      await expect(page.getByText('A new version of the app is ready to install')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Update' })).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should not show update card in Settings page when no update is available', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      await settingsPage.navigateTo('settings')

      await expect(page.getByText('A new version of the app is ready to install')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })
  })
}
