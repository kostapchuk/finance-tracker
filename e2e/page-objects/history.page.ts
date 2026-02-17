import type { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class HistoryPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  getTransactions(): Locator {
    return this.page
      .locator('button.p-3.bg-secondary\\/50.rounded-xl, button[class*="rounded-xl"]')
      .filter({ has: this.page.locator('p.font-medium') })
  }

  getTransactionByComment(comment: string): Locator {
    return this.page
      .locator('button.p-3.bg-secondary\\/50.rounded-xl, button[class*="rounded-xl"]')
      .filter({ hasText: comment })
      .first()
  }

  getTransactionByTitle(title: string): Locator {
    return this.page
      .locator('button.p-3.bg-secondary\\/50.rounded-xl, button[class*="rounded-xl"]')
      .filter({ hasText: title })
      .first()
  }

  async clickTransaction(index: number): Promise<void> {
    await this.getTransactions().nth(index).click()
    await this.page.waitForTimeout(300)
  }

  async clickTransactionByComment(comment: string): Promise<void> {
    await this.page.waitForTimeout(500)
    const tx = this.getTransactionByComment(comment)
    await tx.waitFor({ state: 'visible', timeout: 10000 })
    await tx.click()
    await this.page.waitForTimeout(300)
  }

  getFilterButton(): Locator {
    return this.page.locator('button.h-11.w-11.rounded-full').first()
  }

  async toggleFilters(): Promise<void> {
    const btn = this.getFilterButton()
    await btn.waitFor({ state: 'visible', timeout: 5000 })
    await btn.click()
    await this.page.waitForTimeout(300)
  }

  getTypeFilterPill(type: 'all' | 'income' | 'expense' | 'transfers' | 'loans'): Locator {
    const labels: Record<string, string> = {
      all: 'All|Все',
      income: 'Income|Доходы|доход',
      expense: 'Expense|Расходы|расход',
      transfers: 'Transfers|Переводы|перевод',
      loans: 'Loans|Долги|долг',
    }
    return this.page
      .locator('button.px-4.py-2.rounded-full')
      .filter({ hasText: new RegExp(labels[type], 'i') })
      .first()
  }

  async filterByType(type: 'all' | 'income' | 'expense' | 'transfers' | 'loans'): Promise<void> {
    const pill = this.getTypeFilterPill(type)
    await pill.waitFor({ state: 'visible', timeout: 5000 })
    await pill.click()
    await this.page.waitForTimeout(300)
  }

  getSearchButton(): Locator {
    return this.page.locator('button.h-11.w-11.rounded-full').nth(1)
  }

  getSearchInput(): Locator {
    return this.page.locator('input[placeholder*="earch"], input[placeholder*="Поиск"]')
  }

  async search(query: string): Promise<void> {
    const searchInput = this.getSearchInput()
    if (!(await searchInput.isVisible())) {
      const searchBtn = this.getSearchButton()
      await searchBtn.waitFor({ state: 'visible', timeout: 5000 })
      await searchBtn.click()
      await this.page.waitForTimeout(200)
    }
    await searchInput.fill(query)
    await this.page.waitForTimeout(300)
  }

  async getTransactionCount(): Promise<number> {
    return this.getTransactions().count()
  }

  async getTransactionAmount(index: number): Promise<string> {
    const tx = this.getTransactions().nth(index)
    const amountEl = tx.locator('.font-mono.font-semibold').first()
    return (await amountEl.textContent()) ?? ''
  }

  getDateGroups(): Locator {
    return this.page.locator('h3.text-sm.font-semibold.text-muted-foreground, h3.sticky')
  }

  async getDateGroupTitles(): Promise<string[]> {
    const groups = await this.getDateGroups().allTextContents()
    return groups.map((g) => g.trim())
  }

  async hasNoTransactions(): Promise<boolean> {
    const emptyState = this.page.locator('text=/no.*transactions|транзакций.*нет/i')
    return emptyState.isVisible()
  }

  getLoadingSpinner(): Locator {
    return this.page.locator('.animate-spin')
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => {
      const scrollContainer = document.querySelector('.overflow-auto')
      if (scrollContainer) {
        scrollContainer.scrollTo(0, scrollContainer.scrollHeight)
      }
    })
    await this.page.waitForTimeout(200)
  }

  async waitForMoreTransactions(initialCount: number): Promise<void> {
    await this.page.waitForFunction(
      (count) => document.querySelectorAll('button[class*="rounded-xl"]').length > count,
      initialCount,
      { timeout: 5000 }
    )
  }
}
