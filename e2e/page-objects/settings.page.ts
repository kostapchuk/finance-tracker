import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Section buttons
  getAccountsSection(): Locator {
    return this.page.locator('button').filter({ hasText: /accounts|счета/i }).first();
  }

  getCategoriesSection(): Locator {
    return this.page.locator('button').filter({ hasText: /categories|категории/i }).first();
  }

  getIncomeSourcesSection(): Locator {
    return this.page.locator('button').filter({ hasText: /income.*sources|источники.*дохода/i }).first();
  }

  getCurrenciesSection(): Locator {
    return this.page.locator('button').filter({ hasText: /currencies|валюты/i }).first();
  }

  async openSection(section: 'accounts' | 'categories' | 'income' | 'currencies'): Promise<void> {
    const sectionMap = {
      accounts: this.getAccountsSection(),
      categories: this.getCategoriesSection(),
      income: this.getIncomeSourcesSection(),
      currencies: this.getCurrenciesSection(),
    };
    await sectionMap[section].click();
    await this.page.waitForTimeout(300);
  }

  // Back button (when in a section)
  getBackButton(): Locator {
    return this.page.locator('button').filter({ has: this.page.locator('svg') }).first();
  }

  async goBack(): Promise<void> {
    await this.getBackButton().click();
    await this.page.waitForTimeout(200);
  }

  // Add button (in management sections) - it's the blue rounded + button in header
  getAddButton(): Locator {
    return this.page.locator('button.rounded-full.bg-primary');
  }

  async clickAdd(): Promise<void> {
    await this.getAddButton().click();
    await this.page.waitForTimeout(300);
  }

  // Items list in management sections
  getManagementItems(): Locator {
    return this.page.locator('[class*="rounded-xl"]').filter({ has: this.page.locator('button') });
  }

  getItemByName(name: string): Locator {
    return this.page.locator('[class*="rounded-xl"]').filter({ hasText: name });
  }

  async clickItem(name: string): Promise<void> {
    await this.getItemByName(name).click();
    await this.page.waitForTimeout(300);
  }

  // Edit button for item - in the button group on the right (after drag handle)
  getEditButton(itemName: string): Locator {
    // Item has: drag handle button, then edit/delete buttons in a flex container
    // Edit button is the one with p-2 class that's not the drag handle (cursor-grab)
    return this.getItemByName(itemName).locator('button.p-2').first();
  }

  // Delete button for item - second p-2 button (trash icon)
  getDeleteButtonForItem(itemName: string): Locator {
    return this.getItemByName(itemName).locator('button.p-2').nth(1);
  }

  async editItem(name: string): Promise<void> {
    await this.getEditButton(name).click();
    await this.page.waitForTimeout(300);
  }

  async deleteItem(name: string): Promise<void> {
    await this.getDeleteButtonForItem(name).click();
    await this.page.waitForTimeout(300);
  }

  // Language selector
  getLanguageSelector(): Locator {
    return this.page.locator('button').filter({ hasText: /english|русский/i });
  }

  async selectLanguage(language: 'en' | 'ru'): Promise<void> {
    await this.getLanguageSelector().click();
    await this.page.waitForTimeout(200);
    const option = language === 'en' ? 'English' : 'Русский';
    await this.page.locator('[role="option"]').filter({ hasText: option }).click();
    await this.page.waitForTimeout(200);
  }

  // Main currency selector
  getMainCurrencySelector(): Locator {
    return this.page.locator('[class*="Select"]').filter({ hasText: /USD|EUR|RUB/ }).first();
  }

  // Export/Import
  getExportButton(): Locator {
    return this.page.locator('button').filter({ hasText: /export|экспорт/i });
  }

  getImportButton(): Locator {
    return this.page.locator('button').filter({ hasText: /import|импорт/i });
  }

  // Delete all data
  getDeleteAllButton(): Locator {
    return this.page.locator('button').filter({ hasText: /delete.*all|удалить.*все/i });
  }
}
