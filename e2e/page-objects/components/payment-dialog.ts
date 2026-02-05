import type { Page, Locator } from '@playwright/test';

export class PaymentDialog {
  constructor(private page: Page) {}

  getDialog(): Locator {
    // Custom dialog uses fixed positioning with shadow-lg class
    return this.page.locator('.fixed .shadow-lg.rounded-lg');
  }

  async isVisible(): Promise<boolean> {
    return this.getDialog().isVisible();
  }

  // Amount input (loan currency)
  async fillAmount(amount: string): Promise<void> {
    const input = this.getDialog().locator('input').first();
    await input.fill(amount);
  }

  // Account amount input (for multi-currency)
  async fillAccountAmount(amount: string): Promise<void> {
    const input = this.getDialog().locator('input').nth(1);
    await input.fill(amount);
  }

  // Comment
  async fillComment(comment: string): Promise<void> {
    const commentInput = this.getDialog().locator('input').last();
    await commentInput.fill(comment);
  }

  // Check if multi-currency mode
  async isMultiCurrencyMode(): Promise<boolean> {
    const inputs = this.getDialog().locator('input');
    return (await inputs.count()) > 2;
  }

  // Record payment button
  getRecordButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /record|save|записать|сохранить/i });
  }

  // Pay remaining button
  getPayRemainingButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /pay.*remaining|оплатить.*остаток/i });
  }

  // Edit loan button
  getEditLoanButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /edit.*loan|редактировать/i });
  }

  // Delete loan button
  getDeleteLoanButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /delete|удалить/i });
  }

  // Cancel button
  getCancelButton(): Locator {
    return this.getDialog().locator('button').filter({ hasText: /cancel|close|отмена|закрыть/i });
  }

  async recordPayment(): Promise<void> {
    await this.getRecordButton().click();
    await this.page.waitForTimeout(500);
  }

  async payRemaining(): Promise<void> {
    await this.getPayRemainingButton().click();
    await this.page.waitForTimeout(300);
    // After filling amount, submit the form
    await this.recordPayment();
  }

  async editLoan(): Promise<void> {
    await this.getEditLoanButton().click();
    await this.page.waitForTimeout(300);
  }

  async deleteLoan(): Promise<void> {
    await this.getDeleteLoanButton().click();
    await this.page.waitForTimeout(300);
  }

  async cancel(): Promise<void> {
    await this.getCancelButton().click();
    await this.page.waitForTimeout(300);
  }
}
