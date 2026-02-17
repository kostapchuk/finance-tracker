import type { Page, Locator } from '@playwright/test'

export class PaymentDialog {
  constructor(private page: Page) {}

  getDialog(): Locator {
    // Custom dialog uses fixed positioning with z-[60]
    return this.page.locator('[role="dialog"]')
  }

  async isVisible(): Promise<boolean> {
    return this.getDialog().isVisible()
  }

  // Amount input (loan currency)
  async fillAmount(amount: string): Promise<void> {
    const input = this.getDialog()
      .locator('input[type="number"], input[inputmode="decimal"]')
      .first()
    await input.fill(amount)
  }

  // Account amount input (for multi-currency)
  async fillAccountAmount(amount: string): Promise<void> {
    const input = this.getDialog()
      .locator('input[type="number"], input[inputmode="decimal"]')
      .nth(1)
    await input.fill(amount)
  }

  // Comment
  async fillComment(comment: string): Promise<void> {
    const commentInput = this.getDialog().locator('input[type="text"], textarea').last()
    await commentInput.fill(comment)
  }

  // Check if multi-currency mode
  async isMultiCurrencyMode(): Promise<boolean> {
    const inputs = this.getDialog().locator('input[type="number"], input[inputmode="decimal"]')
    return (await inputs.count()) > 1
  }

  // Record payment button
  getRecordButton(): Locator {
    return this.getDialog()
      .locator('button')
      .filter({ hasText: /record|save|записать|сохранить/i })
  }

  // Pay remaining button
  getPayRemainingButton(): Locator {
    return this.getDialog()
      .locator('button')
      .filter({ hasText: /pay.*remaining|оплатить.*остаток/i })
  }

  // Edit loan button
  getEditLoanButton(): Locator {
    return this.getDialog()
      .locator('button')
      .filter({ hasText: /edit.*loan|редактировать/i })
  }

  // Delete loan button
  getDeleteLoanButton(): Locator {
    return this.getDialog()
      .locator('button')
      .filter({ hasText: /delete|удалить/i })
  }

  // Cancel button
  getCancelButton(): Locator {
    return this.getDialog()
      .locator('button')
      .filter({ hasText: /cancel|close|отмена|закрыть/i })
  }

  async recordPayment(): Promise<void> {
    await this.getRecordButton().click()
    await this.page.waitForTimeout(500)
  }

  async payRemaining(): Promise<void> {
    await this.getPayRemainingButton().click()
    await this.page.waitForTimeout(300)
    // After filling amount, submit the form
    await this.recordPayment()
  }

  async editLoan(): Promise<void> {
    await this.getEditLoanButton().click()
    await this.page.waitForTimeout(300)
  }

  async deleteLoan(): Promise<void> {
    await this.getDeleteLoanButton().click()
    await this.page.waitForTimeout(300)
  }

  async cancel(): Promise<void> {
    await this.getCancelButton().click()
    await this.page.waitForTimeout(300)
  }

  async selectAccount(accountName: string): Promise<void> {
    // Find account select button
    const accountSelect = this.getDialog()
      .locator('button[class*="border"]')
      .filter({ hasText: /\(/ })
    await accountSelect.click()
    await this.page.waitForTimeout(200)
    // Select items have role="option"
    await this.page.locator('[role="option"]').filter({ hasText: accountName }).click()
    await this.page.waitForTimeout(200)
  }

  getAccountSelect(): Locator {
    return this.getDialog().locator('button[class*="border"]').filter({ hasText: /\(/ })
  }
}
