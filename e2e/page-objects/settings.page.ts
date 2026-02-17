import type { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Section buttons on main settings page
  getAccountsSection(): Locator {
    return this.page
      .locator('button')
      .filter({ hasText: /accounts|счета/i })
      .first()
  }

  getCategoriesSection(): Locator {
    return this.page
      .locator('button')
      .filter({ hasText: /categories|категории/i })
      .first()
  }

  getIncomeSourcesSection(): Locator {
    return this.page
      .locator('button')
      .filter({ hasText: /income.*sources|источники.*дохода/i })
      .first()
  }

  getCurrenciesSection(): Locator {
    return this.page
      .locator('button')
      .filter({ hasText: /currencies|валюты/i })
      .first()
  }

  async openSection(section: 'accounts' | 'categories' | 'income' | 'currencies'): Promise<void> {
    const sectionMap = {
      accounts: this.getAccountsSection(),
      categories: this.getCategoriesSection(),
      income: this.getIncomeSourcesSection(),
      currencies: this.getCurrenciesSection(),
    }
    await sectionMap[section].click()
    await this.page
      .locator('button[aria-label="Back"]')
      .waitFor({ state: 'visible', timeout: 5000 })
    await this.waitForDataOrEmpty()
  }

  async waitForDataOrEmpty(): Promise<void> {
    const items = this.page
      .locator('div[class*="rounded-xl"]')
      .filter({ has: this.page.locator('p.font-medium') })
    const emptyMessage = this.page.locator('text=/no.*yet|пока.*нет/i')
    const spinner = this.page.locator('.animate-spin')

    try {
      await Promise.race([
        items.first().waitFor({ state: 'visible', timeout: 5000 }),
        emptyMessage.waitFor({ state: 'visible', timeout: 5000 }),
        spinner.waitFor({ state: 'hidden', timeout: 5000 }).then(async () => {
          await this.page.waitForTimeout(200)
        }),
      ])
    } catch {
      // Timeout - check if we have empty state or retry
    }
    await this.page.waitForTimeout(200)
  }

  // Back button (when in a section) - has aria-label="Back"
  getBackButton(): Locator {
    return this.page.locator('button[aria-label="Back"]')
  }

  async goBack(): Promise<void> {
    await this.getBackButton().click()
    await this.page.waitForTimeout(200)
  }

  // Add button (in management sections) - it's the blue rounded + button in header
  getAddButton(): Locator {
    return this.page.locator('button[aria-label="Add"]')
  }

  async clickAdd(): Promise<void> {
    await this.getAddButton().click()
    await this.page.waitForTimeout(300)
  }

  getManagementItems(): Locator {
    return this.page
      .locator('div[class*="rounded-xl"]')
      .filter({ has: this.page.locator('p.font-medium') })
  }

  getItemByName(name: string): Locator {
    return this.page
      .locator('div[class*="rounded-xl"]')
      .filter({ has: this.page.locator('p.font-medium') })
      .filter({ hasText: name })
      .first()
  }

  async clickItem(name: string): Promise<void> {
    await this.getItemByName(name).click()
    await this.page.waitForTimeout(300)
  }

  async waitForItem(name: string): Promise<void> {
    const noItemsMessage = this.page.locator('text=/no.*yet|пока.*нет/i')
    const itemLocator = this.page
      .locator('div[class*="rounded-xl"]')
      .filter({ has: this.page.locator('p.font-medium') })
      .filter({ hasText: name })
      .first()

    try {
      await itemLocator.waitFor({ state: 'visible', timeout: 10000 })
    } catch {
      if (await noItemsMessage.isVisible()) {
        throw new Error(`Item "${name}" not found - the management list appears empty`)
      }
      throw new Error(`Item "${name}" not found after waiting 10s`)
    }
    await this.page.waitForTimeout(200)
  }

  async editItem(name: string): Promise<void> {
    await this.waitForItem(name)
    const item = this.getItemByName(name)
    await item.waitFor({ state: 'visible', timeout: 5000 })
    await item.locator('button[aria-label="Edit"]').click()
    await this.page.waitForTimeout(300)
  }

  async deleteItem(name: string): Promise<void> {
    await this.waitForItem(name)
    const item = this.getItemByName(name)
    await item.waitFor({ state: 'visible', timeout: 5000 })
    await item.locator('button[aria-label="Delete"]').click()
    await this.page.waitForTimeout(300)
  }

  // Language selector
  getLanguageSelector(): Locator {
    return this.page.locator('button').filter({ hasText: /english|русский/i })
  }

  async selectLanguage(language: 'en' | 'ru'): Promise<void> {
    await this.getLanguageSelector().click()
    await this.page.waitForTimeout(200)
    const option = language === 'en' ? 'English' : 'Русский'
    await this.page.locator('[role="option"]').filter({ hasText: option }).click()
    await this.page.waitForTimeout(200)
  }

  // Main currency selector
  getMainCurrencySelector(): Locator {
    return this.page
      .locator('[class*="Select"]')
      .filter({ hasText: /USD|EUR|RUB/ })
      .first()
  }

  // Export/Import
  getExportButton(): Locator {
    return this.page.locator('button').filter({ hasText: /export|экспорт/i })
  }

  getImportButton(): Locator {
    return this.page.locator('button').filter({ hasText: /import|импорт/i })
  }

  // Delete all data
  getDeleteAllButton(): Locator {
    return this.page.locator('button').filter({ hasText: /delete.*all|удалить.*все/i })
  }
}
