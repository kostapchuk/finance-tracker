import type { Page, Locator } from '@playwright/test';

export class AccountForm {
  constructor(private page: Page) {}

  getDialog(): Locator {
    return this.page.locator('[role="dialog"]');
  }

  async isVisible(): Promise<boolean> {
    return this.getDialog().isVisible();
  }

  // Form fields
  getNameInput(): Locator {
    return this.page.locator('input').filter({ hasText: '' }).first();
  }

  getTypeSelect(): Locator {
    return this.page.locator('[role="combobox"]').first();
  }

  getCurrencySelect(): Locator {
    return this.page.locator('[role="combobox"]').nth(1);
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
    await this.page.locator('[role="option"]').filter({ hasText: new RegExp(typeLabels[type], 'i') }).click();
  }

  async selectCurrency(currency: string): Promise<void> {
    await this.getCurrencySelect().click();
    await this.page.locator('[role="option"]').filter({ hasText: currency }).click();
  }

  async fillBalance(balance: string): Promise<void> {
    const input = this.getDialog().locator('input').nth(1);
    await input.fill(balance);
  }

  // Save/Cancel
  getSaveButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /save|add|сохранить|добавить/i });
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
