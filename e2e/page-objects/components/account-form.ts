import type { Page, Locator } from '@playwright/test';

export class AccountForm {
  constructor(private page: Page) {}

  getDialog(): Locator {
    // Custom dialog uses fixed positioning with shadow-lg class
    return this.page.locator('.fixed .shadow-lg.rounded-lg');
  }

  async isVisible(): Promise<boolean> {
    return this.getDialog().isVisible();
  }

  // Form fields
  getNameInput(): Locator {
    return this.page.locator('input').filter({ hasText: '' }).first();
  }

  getTypeSelect(): Locator {
    // Custom Select uses button with border and ChevronDown icon
    return this.getDialog().locator('button.border').first();
  }

  getCurrencySelect(): Locator {
    return this.getDialog().locator('button.border').nth(1);
  }

  getBalanceInput(): Locator {
    return this.page.locator('input[type="number"], input[inputmode="decimal"]').first();
  }

  // Form actions
  async fillName(name: string): Promise<void> {
    const input = this.getDialog().locator('input').first();
    await input.fill(name);
  }

  async selectType(type: 'cash' | 'bank' | 'crypto' | 'investment' | 'credit_card'): Promise<void> {
    const typeLabels: Record<string, string> = {
      cash: 'Cash|Наличные',
      bank: 'Bank|Банк',
      crypto: 'Crypto|Крипто',
      investment: 'Investment|Инвест',
      credit_card: 'Credit|Кредит',
    };
    await this.getTypeSelect().click();
    // Custom Select items are divs with cursor-pointer class in dropdown
    await this.page.locator('.z-50 .cursor-pointer').filter({ hasText: new RegExp(typeLabels[type], 'i') }).click();
  }

  async selectCurrency(currency: string): Promise<void> {
    await this.getCurrencySelect().click();
    // Use exact match pattern to avoid USD matching USDT
    await this.page.locator('.z-50 .cursor-pointer').filter({ hasText: new RegExp(`${currency} -|${currency}$`, 'i') }).first().click();
  }

  async fillBalance(balance: string): Promise<void> {
    const input = this.getDialog().locator('input').nth(1);
    await input.fill(balance);
  }

  // Save/Cancel
  getSaveButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /save|create|update|add|сохранить|создать|обновить|добавить/i });
  }

  getCancelButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /cancel|отмена/i });
  }

  async save(): Promise<void> {
    await this.getSaveButton().click();
    await this.page.waitForTimeout(500);
  }

  async cancel(): Promise<void> {
    await this.getCancelButton().click();
    await this.page.waitForTimeout(300);
  }

  // Delete (in edit mode)
  getDeleteButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /delete|удалить/i });
  }

  async delete(): Promise<void> {
    await this.getDeleteButton().click();
    await this.page.waitForTimeout(300);
  }
}
