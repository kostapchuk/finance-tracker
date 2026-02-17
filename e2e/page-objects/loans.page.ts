import type { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class LoansPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Add new loan button
  getAddButton(): Locator {
    return this.page
      .locator('button')
      .filter({ has: this.page.locator('.lucide-plus') })
      .filter({ hasText: /add|добавить/i })
  }

  async clickAdd(): Promise<void> {
    await this.getAddButton().click()
    await this.page.waitForTimeout(300)
  }

  // Loan cards
  getLoans(): Locator {
    return this.page
      .locator('button.w-full.text-left')
      .filter({ has: this.page.locator('[class*="bg-secondary"]') })
  }

  getLoanByPersonName(name: string): Locator {
    return this.page.locator('button.w-full.text-left').filter({ hasText: name })
  }

  async clickLoan(personName: string): Promise<void> {
    await this.getLoanByPersonName(personName).click()
    await this.page.waitForTimeout(300)
  }

  // Summary sections
  getOwedToYouAmount(): Locator {
    return this.page.locator('[class*="bg-secondary"]').first().locator('.text-xl.font-bold')
  }

  getYouOweAmount(): Locator {
    return this.page.locator('[class*="bg-secondary"]').nth(1).locator('.text-xl.font-bold')
  }

  // Money given section
  getMoneyGivenSection(): Locator {
    return this.page.locator('section').filter({ hasText: /money.*given|одолжили/i })
  }

  getMoneyGivenLoans(): Locator {
    return this.getMoneyGivenSection().locator('button.w-full.text-left')
  }

  // Money received section
  getMoneyReceivedSection(): Locator {
    return this.page.locator('section').filter({ hasText: /money.*received|получили/i })
  }

  getMoneyReceivedLoans(): Locator {
    return this.getMoneyReceivedSection().locator('button.w-full.text-left')
  }

  // Completed loans section
  getCompletedSection(): Locator {
    return this.page.locator('section').filter({ hasText: /completed|завершённые/i })
  }

  getCompletedLoans(): Locator {
    return this.getCompletedSection().locator('[class*="bg-secondary"]')
  }

  // Section toggles
  async toggleMoneyGivenSection(): Promise<void> {
    await this.getMoneyGivenSection().locator('button').first().click()
    await this.page.waitForTimeout(200)
  }

  async toggleMoneyReceivedSection(): Promise<void> {
    await this.getMoneyReceivedSection().locator('button').first().click()
    await this.page.waitForTimeout(200)
  }

  // Loan count helpers
  async getMoneyGivenCount(): Promise<number> {
    return this.getMoneyGivenLoans().count()
  }

  async getMoneyReceivedCount(): Promise<number> {
    return this.getMoneyReceivedLoans().count()
  }

  async getCompletedCount(): Promise<number> {
    return this.getCompletedLoans().count()
  }
}
