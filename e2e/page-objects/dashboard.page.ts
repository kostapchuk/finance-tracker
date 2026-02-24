import type { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Income sources section - dnd-kit doesn't render ids to DOM
  getIncomeSection(): Locator {
    return this.page.locator('section').filter({ hasText: /^INCOME/i })
  }

  getIncomeSources(): Locator {
    return this.getIncomeSection().locator('.flex.gap-2 > div')
  }

  getIncomeSourceByName(name: string): Locator {
    const shortName = name.substring(0, 8)
    return this.getIncomeSection()
      .locator('button')
      .filter({ hasText: new RegExp(shortName, 'i') })
      .first()
  }

  // Accounts section - dnd-kit doesn't render ids to DOM, use section-based locators
  getAccountsSection(): Locator {
    return this.page.locator('section').filter({ hasText: /^ACCOUNTS/i })
  }

  getAccounts(): Locator {
    return this.getAccountsSection().locator('.flex.gap-2 > div')
  }

  getAccountByName(name: string): Locator {
    const shortName = name.substring(0, 8)
    return this.getAccountsSection()
      .locator('button')
      .filter({ hasText: new RegExp(shortName, 'i') })
      .first()
  }

  getAccountDraggable(name: string): Locator {
    const shortName = name.substring(0, 8)
    return this.getAccountsSection()
      .locator('button')
      .filter({ hasText: new RegExp(shortName, 'i') })
      .first()
  }

  // Categories/Expenses section - dnd-kit doesn't render ids to DOM
  getExpensesSection(): Locator {
    return this.page.locator('section').filter({ hasText: /^EXPENSES/i })
  }

  getCategories(): Locator {
    return this.getExpensesSection().locator('.flex.gap-2 > div')
  }

  getCategoryByName(name: string): Locator {
    const shortName = name.substring(0, 8)
    return this.getExpensesSection()
      .locator('button')
      .filter({ hasText: new RegExp(shortName, 'i') })
      .first()
  }

  // Add buttons
  getAddIncomeSourceButton(): Locator {
    return this.page.getByRole('button', { name: /add.*income/i })
  }

  getAddAccountButton(): Locator {
    return this.page.getByRole('button', { name: /add.*account/i })
  }

  getAddCategoryButton(): Locator {
    return this.page.getByRole('button', { name: /add.*category/i })
  }

  // Drag and drop helper for @dnd-kit
  // @dnd-kit PointerSensor requires 8px movement to activate drag
  async performDragDrop(source: Locator, target: Locator): Promise<void> {
    const sourceBox = await source.boundingBox()
    const targetBox = await target.boundingBox()

    if (!sourceBox || !targetBox) {
      throw new Error('Could not get bounding boxes for drag and drop')
    }

    const sourceCenter = {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2,
    }
    const targetCenter = {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2,
    }

    // Move to source
    await this.page.mouse.move(sourceCenter.x, sourceCenter.y)
    await this.page.waitForTimeout(50)

    // Mouse down
    await this.page.mouse.down()
    await this.page.waitForTimeout(50)

    // Move 10px to activate drag (dnd-kit requires 8px minimum)
    await this.page.mouse.move(sourceCenter.x + 10, sourceCenter.y + 10, { steps: 5 })
    await this.page.waitForTimeout(100)

    // Move to target with intermediate steps for smooth drag
    await this.page.mouse.move(targetCenter.x, targetCenter.y, { steps: 15 })
    await this.page.waitForTimeout(100)

    // Drop
    await this.page.mouse.up()
    await this.page.waitForTimeout(300)
  }

  // Touch-based drag for mobile testing
  // @dnd-kit TouchSensor requires 200ms delay + 5px tolerance
  async performTouchDragDrop(source: Locator, target: Locator): Promise<void> {
    const sourceBox = await source.boundingBox()
    const targetBox = await target.boundingBox()

    if (!sourceBox || !targetBox) {
      throw new Error('Could not get bounding boxes for touch drag and drop')
    }

    const sourceCenter = {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2,
    }
    const targetCenter = {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2,
    }

    // Touch start
    await this.page.touchscreen.tap(sourceCenter.x, sourceCenter.y)

    // Wait 250ms to activate TouchSensor (requires 200ms delay)
    await this.page.waitForTimeout(250)

    // Simulate touch move sequence
    // Note: Playwright touchscreen doesn't have direct touchMove, so we use evaluate
    await this.page.evaluate(
      async ({ startX, startY, endX, endY }) => {
        const touchMove = (x: number, y: number) => {
          const touch = new Touch({
            identifier: 0,
            target: document.elementFromPoint(startX, startY) || document.body,
            clientX: x,
            clientY: y,
          })
          document.elementFromPoint(x, y)?.dispatchEvent(
            new TouchEvent('touchmove', {
              bubbles: true,
              cancelable: true,
              touches: [touch],
              changedTouches: [touch],
            })
          )
        }

        // Move in steps
        const steps = 15
        for (let i = 1; i <= steps; i++) {
          const x = startX + (endX - startX) * (i / steps)
          const y = startY + (endY - startY) * (i / steps)
          touchMove(x, y)
          await new Promise((r) => setTimeout(r, 20))
        }
      },
      { startX: sourceCenter.x, startY: sourceCenter.y, endX: targetCenter.x, endY: targetCenter.y }
    )

    // Touch end at target
    await this.page.touchscreen.tap(targetCenter.x, targetCenter.y)
    await this.page.waitForTimeout(300)
  }

  // Alternative: Trigger dnd-kit drag via keyboard (if accessible)
  // Or use programmatic approach that bypasses activation constraints
  async triggerDragViaClick(incomeName: string, accountName: string): Promise<void> {
    // Click income source to select
    await this.getIncomeSourceByName(incomeName).click()
    await this.page.waitForTimeout(100)
    // Click account to "drop"
    await this.getAccountByName(accountName).click()
    await this.page.waitForTimeout(300)
  }

  // Drag income source to account
  async dragIncomeToAccount(incomeName: string, accountName: string): Promise<void> {
    const income = this.getIncomeSourceByName(incomeName)
    const account = this.getAccountByName(accountName)
    await this.performDragDrop(income, account)
  }

  // Drag account to category
  async dragAccountToCategory(accountName: string, categoryName: string): Promise<void> {
    const account = this.getAccountDraggable(accountName)
    const category = this.getCategoryByName(categoryName)
    await this.performDragDrop(account, category)
  }

  // Drag account to account (transfer)
  async dragAccountToAccount(fromAccountName: string, toAccountName: string): Promise<void> {
    const fromAccount = this.getAccountDraggable(fromAccountName)
    const toAccount = this.getAccountByName(toAccountName)
    await this.performDragDrop(fromAccount, toAccount)
  }

  // Expand/collapse sections
  async toggleIncomeSection(): Promise<void> {
    const button = this.page
      .locator('button')
      .filter({ hasText: /income/i })
      .first()
    await button.click()
  }

  async toggleExpensesSection(): Promise<void> {
    const button = this.page
      .locator('button')
      .filter({ hasText: /expenses/i })
      .first()
    await button.click()
  }

  // Month selector
  async selectMonth(monthOffset: number): Promise<void> {
    const monthSelector = this.page.locator('[class*="MonthSelector"]')
    if (monthOffset > 0) {
      for (let i = 0; i < monthOffset; i++) {
        await monthSelector.locator('button:has(svg)').last().click()
      }
    } else if (monthOffset < 0) {
      for (let i = 0; i < Math.abs(monthOffset); i++) {
        await monthSelector.locator('button:has(svg)').first().click()
      }
    }
  }
}
