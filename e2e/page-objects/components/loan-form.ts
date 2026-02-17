import type { Page, Locator } from '@playwright/test'

export class LoanForm {
  constructor(private page: Page) {}

  getDialog(): Locator {
    return this.page.locator('[role="dialog"]')
  }

  async isVisible(): Promise<boolean> {
    return this.getDialog().isVisible()
  }

  getTypeSelect(): Locator {
    return this.getDialog()
      .locator('div.space-y-2')
      .filter({ hasText: /^type|тип/i })
      .locator('button[class*="border"]')
      .first()
  }

  getAccountSelect(): Locator {
    return this.getDialog()
      .locator('div.space-y-2')
      .filter({ hasText: /related.*account|связан.*счет|account$/i })
      .locator('button[class*="border"]')
      .first()
  }

  getCurrencySelect(): Locator {
    return this.getDialog()
      .locator('div.space-y-2')
      .filter({ hasText: /^currency|валют/i })
      .locator('button[class*="border"]')
      .first()
  }

  async selectType(type: 'given' | 'received'): Promise<void> {
    const typeLabels: Record<string, string> = {
      given: 'Given|Одолжено|moneyILent|одолжено',
      received: 'Received|Получено|moneyIBorrowed|получено',
    }
    const select = this.getTypeSelect()
    await select.click()
    await this.page.waitForTimeout(200)
    await this.page.locator('[role="option"]').first().waitFor({ state: 'visible', timeout: 3000 })
    await this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(typeLabels[type], 'i') })
      .click()
    await this.page.waitForTimeout(200)
  }

  async fillPersonName(name: string): Promise<void> {
    const input = this.getDialog().locator('input[type="text"], input:not([type])').first()
    await input.fill(name)
  }

  async fillDescription(description: string): Promise<void> {
    const textarea = this.getDialog().locator('textarea')
    await textarea.fill(description)
  }

  async fillAmount(amount: string): Promise<void> {
    const input = this.getDialog()
      .locator('input[type="number"], input[inputmode="decimal"]')
      .first()
    await input.fill(amount)
  }

  async fillAccountAmount(amount: string): Promise<void> {
    const inputs = this.getDialog().locator('input[type="number"], input[inputmode="decimal"]')
    await inputs.nth(1).fill(amount)
  }

  async selectAccount(accountName: string): Promise<void> {
    const select = this.getAccountSelect()
    const currentText = await select.textContent()
    if (currentText?.includes(accountName)) {
      return
    }
    await select.click()
    await this.page.waitForTimeout(200)
    await this.page.locator('[role="option"]').first().waitFor({ state: 'visible', timeout: 3000 })
    await this.page.locator('[role="option"]').filter({ hasText: accountName }).click()
    await this.page.waitForTimeout(200)
  }

  async selectCurrency(currency: string): Promise<void> {
    const select = this.getCurrencySelect()
    await select.click()
    await this.page.waitForTimeout(200)
    await this.page.locator('[role="option"]').first().waitFor({ state: 'visible', timeout: 3000 })
    await this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(`${currency}\\s*-|${currency}$`, 'i') })
      .first()
      .click()
    await this.page.waitForTimeout(200)
  }

  async setDueDate(date: string): Promise<void> {
    const input = this.getDialog().locator('input[type="date"]')
    await input.fill(date)
  }

  async isMultiCurrencyMode(): Promise<boolean> {
    const inputs = this.getDialog().locator('input[type="number"], input[inputmode="decimal"]')
    return (await inputs.count()) > 1
  }

  getSaveButton(): Locator {
    return this.getDialog()
      .locator('button[type="submit"], button')
      .filter({ hasText: /save|add|create|update|сохранить|добавить|создать|обновить/i })
  }

  getCancelButton(): Locator {
    return this.getDialog()
      .locator('button')
      .filter({ hasText: /cancel|отмена/i })
  }

  async save(): Promise<void> {
    await this.getSaveButton().click()
    await this.page.waitForTimeout(500)
  }

  async cancel(): Promise<void> {
    await this.getCancelButton().click()
    await this.page.waitForTimeout(300)
  }

  getDeleteButton(): Locator {
    return this.getDialog()
      .locator('button')
      .filter({ hasText: /delete|удалить/i })
  }

  async delete(): Promise<void> {
    await this.getDeleteButton().click()
    await this.page.waitForTimeout(300)
  }
}
