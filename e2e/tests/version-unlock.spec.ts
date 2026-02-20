import { test, expect } from '../fixtures/test-base'

test.describe('Version Tap Cloud Unlock Flow', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState('sync-disabled')
  })

  test('should not show migration dialog on fresh load when not unlocked', async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.navigateTo('settings')

    await expect(page.getByText('Migrate Your Data')).not.toBeVisible()

    const cloudUnlocked = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlocked).toBe(false)
  })

  test('should unlock cloud features after tapping version 5 times within 5 seconds', async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.navigateTo('settings')

    const cloudUnlockedBefore = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlockedBefore).toBe(false)

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    for (let i = 0; i < 5; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(300)

    const cloudUnlockedAfter = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlockedAfter).toBe(true)
  })

  test('should reset counter if taps are more than 5 seconds apart', async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.navigateTo('settings')

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    for (let i = 0; i < 4; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(5500)

    await versionButton.click()

    await page.waitForTimeout(300)

    const cloudUnlockedAfterTimeout = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlockedAfterTimeout).toBe(false)

    for (let i = 0; i < 4; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(300)

    const cloudUnlockedAfterFullTaps = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlockedAfterFullTaps).toBe(true)
  })

  test('should not change state if already unlocked', async ({ page, settingsPage }) => {
    await page.addInitScript(() => {
      localStorage.setItem('finance-tracker-cloud-unlocked', 'true')
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

    await settingsPage.navigateTo('settings')

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    for (let i = 0; i < 5; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(300)

    const cloudUnlocked = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlocked).toBe(true)
  })

  test('should persist cloud unlock across page reloads', async ({
    page,
    settingsPage,
    dbHelper,
  }) => {
    await settingsPage.navigateTo('settings')

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    for (let i = 0; i < 5; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(300)

    const cloudUnlockedBefore = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlockedBefore).toBe(true)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

    await dbHelper.waitForAppReady()

    const cloudUnlockedAfter = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlockedAfter).toBe(true)
  })

  test('should show version button with primary color when cloud is unlocked', async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.navigateTo('settings')

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    await expect(versionButton).not.toHaveClass(/text-primary/)

    for (let i = 0; i < 5; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(300)

    await expect(versionButton).toHaveClass(/text-primary/)
  })

  test('should require exactly 5 taps - 4 taps should not unlock', async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.navigateTo('settings')

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    for (let i = 0; i < 4; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(500)

    const cloudUnlocked = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlocked).toBe(false)
  })

  test('should work for new user - first time tapping version 5 times unlocks', async ({
    page,
    settingsPage,
  }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('finance-tracker-cloud-unlocked')
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

    await settingsPage.navigateTo('settings')

    const cloudUnlockedBefore = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked')
    })
    expect(cloudUnlockedBefore).toBeNull()

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    for (let i = 0; i < 5; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(300)

    const cloudUnlockedAfter = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlockedAfter).toBe(true)
  })

  test('should work for returning user who previously unlocked - tap should do nothing', async ({
    page,
    settingsPage,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('finance-tracker-cloud-unlocked', 'true')
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

    await settingsPage.navigateTo('settings')

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    await expect(versionButton).toHaveClass(/text-primary/)

    for (let i = 0; i < 5; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(300)

    const cloudUnlocked = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlocked).toBe(true)
  })

  test('should allow multiple unlock attempts - tap 3 times, wait, tap 5 times again', async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.navigateTo('settings')

    const versionButton = page.getByRole('button', { name: /Finance Tracker v/ })
    await expect(versionButton).toBeVisible()

    for (let i = 0; i < 3; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(5500)

    for (let i = 0; i < 5; i++) {
      await versionButton.click()
    }

    await page.waitForTimeout(300)

    const cloudUnlocked = await page.evaluate(() => {
      return localStorage.getItem('finance-tracker-cloud-unlocked') === 'true'
    })
    expect(cloudUnlocked).toBe(true)
  })
})
