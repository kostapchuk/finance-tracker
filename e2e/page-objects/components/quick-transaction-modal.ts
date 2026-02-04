import type { Page, Locator } from '@playwright/test';

export class QuickTransactionModal {
  constructor(private page: Page) {}

  getModal(): Locator {
    return this.page.locator('.fixed.inset-x-0').first();
  }

  async isVisible(): Promise<boolean> {
    return this.getModal().isVisible();
  }

  // Amount inputs
  getAmountInput(): Locator {
    return this.page.locator('input[inputmode="decimal"]').first();
  }

  getSecondAmountInput(): Locator {
    return this.page.locator('input[inputmode="decimal"]').nth(1);
  }

  getThirdAmountInput(): Locator {
    return this.page.locator('input[inputmode="decimal"]').nth(2);
  }

  async isMultiCurrencyMode(): Promise<boolean> {
    const inputs = this.page.locator('input[inputmode="decimal"]');
    return (await inputs.count()) > 1;
  }

  async enterAmount(amount: string): Promise<void> {
    const input = this.getAmountInput();
    await input.fill(amount);
  }

  async enterSecondAmount(amount: string): Promise<void> {
    const input = this.getSecondAmountInput();
    await input.fill(amount);
  }

  async enterThirdAmount(amount: string): Promise<void> {
    const input = this.getThirdAmountInput();
    await input.fill(amount);
  }

  // Comment
  getCommentInput(): Locator {
    return this.page.locator('textarea');
  }

  async enterComment(comment: string): Promise<void> {
    await this.getCommentInput().fill(comment);
  }

  // Date
  getDateInput(): Locator {
    return this.page.locator('input[type="date"]');
  }

  async setDate(date: string): Promise<void> {
    await this.getDateInput().fill(date);
  }

  // Save/Submit
  getSaveButton(): Locator {
    return this.page.locator('button').filter({ hasText: /save|update|сохранить|обновить/i });
  }

  async save(): Promise<void> {
    await this.getSaveButton().click();
    await this.page.waitForTimeout(500);
  }

  // Delete (in edit mode)
  getDeleteButton(): Locator {
    return this.page.locator('button').filter({ has: this.page.locator('svg.text-destructive') });
  }

  async delete(): Promise<void> {
    await this.getDeleteButton().click();
    await this.page.waitForTimeout(300);
  }

  // Account picker
  async openAccountPicker(): Promise<void> {
    // Click on account in header
    const accountButton = this.page.locator('.flex.items-center.justify-between button').filter({ hasText: /\$|€/ }).first();
    await accountButton.click();
  }

  async selectAccount(accountName: string): Promise<void> {
    await this.page.locator('.absolute.inset-0 button').filter({ hasText: accountName }).click();
    await this.page.waitForTimeout(200);
  }

  // Source picker (for income)
  async openSourcePicker(): Promise<void> {
    const sourceButton = this.page.locator('.flex.items-center.justify-between button').first();
    await sourceButton.click();
  }

  async selectSource(sourceName: string): Promise<void> {
    await this.page.locator('.absolute.inset-0 button').filter({ hasText: sourceName }).click();
    await this.page.waitForTimeout(200);
  }

  // Category picker (for expense)
  async openCategoryPicker(): Promise<void> {
    const categoryButton = this.page.locator('.flex.items-center.justify-between button').last();
    await categoryButton.click();
  }

  async selectCategory(categoryName: string): Promise<void> {
    await this.page.locator('.absolute.inset-0 button').filter({ hasText: categoryName }).click();
    await this.page.waitForTimeout(200);
  }

  // Close modal (swipe down or click outside)
  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }
}
