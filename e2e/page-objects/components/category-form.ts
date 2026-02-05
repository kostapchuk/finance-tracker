import type { Page, Locator } from '@playwright/test';

export class CategoryForm {
  constructor(private page: Page) {}

  getDialog(): Locator {
    // Custom dialog uses fixed positioning with shadow-lg class
    return this.page.locator('.fixed .shadow-lg.rounded-lg');
  }

  async isVisible(): Promise<boolean> {
    return this.getDialog().isVisible();
  }

  // Form fields
  async fillName(name: string): Promise<void> {
    const input = this.getDialog().locator('input').first();
    await input.fill(name);
  }

  async fillBudget(budget: string): Promise<void> {
    const input = this.getDialog().locator('input[type="number"], input[inputmode="decimal"]').first();
    await input.fill(budget);
  }

  async selectBudgetPeriod(period: 'weekly' | 'monthly' | 'yearly'): Promise<void> {
    const periodLabels: Record<string, string> = {
      weekly: 'Week|Недел',
      monthly: 'Month|Месяц',
      yearly: 'Year|Год',
    };
    // Custom Select trigger - the one with w-full class (not Cancel button)
    const select = this.getDialog().locator('button.w-full.border');
    await select.click();
    // Custom Select items are divs with cursor-pointer class
    await this.page.locator('.z-50 .cursor-pointer').filter({ hasText: new RegExp(periodLabels[period], 'i') }).click();
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
