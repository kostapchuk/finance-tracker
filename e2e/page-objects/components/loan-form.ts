import type { Page, Locator } from '@playwright/test';

export class LoanForm {
  constructor(private page: Page) {}

  getDialog(): Locator {
    // Custom dialog uses fixed positioning with shadow-lg class
    return this.page.locator('.fixed .shadow-lg.rounded-lg');
  }

  async isVisible(): Promise<boolean> {
    return this.getDialog().isVisible();
  }

  // Type selector (given/received)
  async selectType(type: 'given' | 'received'): Promise<void> {
    const typeLabels: Record<string, string> = {
      given: 'Given|Одолжено',
      received: 'Received|Получено',
    };
    // First select in the form is type
    const select = this.getDialog().locator('button.w-full.border').first();
    await select.click();
    await this.page.locator('.z-50 .cursor-pointer').filter({ hasText: new RegExp(typeLabels[type], 'i') }).click();
  }

  // Person name
  async fillPersonName(name: string): Promise<void> {
    const input = this.getDialog().locator('input').first();
    await input.fill(name);
  }

  // Description
  async fillDescription(description: string): Promise<void> {
    const textarea = this.getDialog().locator('textarea');
    await textarea.fill(description);
  }

  // Amount
  async fillAmount(amount: string): Promise<void> {
    const input = this.getDialog().locator('input[type="number"], input[inputmode="decimal"]').first();
    await input.fill(amount);
  }

  // Account amount (for multi-currency)
  async fillAccountAmount(amount: string): Promise<void> {
    const input = this.getDialog().locator('input[type="number"], input[inputmode="decimal"]').nth(1);
    await input.fill(amount);
  }

  // Account selector (second select, after Type)
  async selectAccount(accountName: string): Promise<void> {
    const select = this.getDialog().locator('button.w-full.border').nth(1);
    await select.click();
    await this.page.locator('.z-50 .cursor-pointer').filter({ hasText: accountName }).click();
  }

  // Currency selector (third select, after Account)
  async selectCurrency(currency: string): Promise<void> {
    const select = this.getDialog().locator('button.w-full.border').nth(2);
    await select.click();
    await this.page.locator('.z-50 .cursor-pointer').filter({ hasText: new RegExp(`${currency} -|${currency}$`, 'i') }).first().click();
  }

  // Due date
  async setDueDate(date: string): Promise<void> {
    const input = this.getDialog().locator('input[type="date"]');
    await input.fill(date);
  }

  // Check if multi-currency mode
  async isMultiCurrencyMode(): Promise<boolean> {
    const inputs = this.getDialog().locator('input[type="number"], input[inputmode="decimal"]');
    return (await inputs.count()) > 1;
  }

  // Save/Cancel
  getSaveButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /save|add|create|update|сохранить|добавить|создать|обновить/i });
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
