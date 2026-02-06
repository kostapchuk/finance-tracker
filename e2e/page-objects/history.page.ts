import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HistoryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Transactions list
  getTransactions(): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-xl').filter({ has: this.page.locator('p.font-medium') });
  }

  getTransactionByComment(comment: string): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-xl').filter({ hasText: comment });
  }

  getTransactionByTitle(title: string): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-xl').filter({ hasText: title });
  }

  async clickTransaction(index: number): Promise<void> {
    await this.getTransactions().nth(index).click();
    await this.page.waitForTimeout(300);
  }

  async clickTransactionByComment(comment: string): Promise<void> {
    await this.getTransactionByComment(comment).click();
    await this.page.waitForTimeout(300);
  }

  // Filters
  getFilterButton(): Locator {
    return this.page.locator('button').filter({ has: this.page.locator('svg') }).filter({ hasText: '' }).first();
  }

  async toggleFilters(): Promise<void> {
    await this.getFilterButton().click();
    await this.page.waitForTimeout(200);
  }

  getTypeFilterPill(type: 'all' | 'income' | 'expense' | 'transfers' | 'loans'): Locator {
    const labels: Record<string, string> = {
      all: 'All|Все',
      income: 'Income|Доходы',
      expense: 'Expense|Расходы',
      transfers: 'Transfers|Переводы',
      loans: 'Loans|Долги',
    };
    return this.page.locator('button.rounded-full').filter({ hasText: new RegExp(labels[type], 'i') });
  }

  async filterByType(type: 'all' | 'income' | 'expense' | 'transfers' | 'loans'): Promise<void> {
    await this.getTypeFilterPill(type).click();
    await this.page.waitForTimeout(200);
  }

  // Search
  getSearchButton(): Locator {
    // Search button has lucide-react Search icon (svg with class lucide-search)
    return this.page.locator('button.p-2.rounded-full').filter({ has: this.page.locator('.lucide-search') });
  }

  getSearchInput(): Locator {
    return this.page.locator('input[placeholder*="earch"], input[placeholder*="Поиск"]');
  }

  async search(query: string): Promise<void> {
    const searchInput = this.getSearchInput();
    if (!(await searchInput.isVisible())) {
      await this.getSearchButton().click();
      await this.page.waitForTimeout(200);
    }
    await searchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  // Transaction details
  async getTransactionCount(): Promise<number> {
    return this.getTransactions().count();
  }

  async getTransactionAmount(index: number): Promise<string> {
    const tx = this.getTransactions().nth(index);
    const amountEl = tx.locator('.font-mono.font-semibold').first();
    return amountEl.textContent() || '';
  }

  // Date groups
  getDateGroups(): Locator {
    return this.page.locator('h3.text-sm.font-semibold.text-muted-foreground');
  }

  async getDateGroupTitles(): Promise<string[]> {
    const groups = await this.getDateGroups().allTextContents();
    return groups.map(g => g.trim());
  }

  // Empty state
  async hasNoTransactions(): Promise<boolean> {
    const emptyState = this.page.locator('text=/no.*transactions|транзакций.*нет/i');
    return emptyState.isVisible();
  }

  // Infinite scroll
  getLoadingSpinner(): Locator {
    return this.page.locator('.animate-spin');
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => {
      const scrollContainer = document.querySelector('.overflow-auto');
      if (scrollContainer) {
        scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
      }
    });
    await this.page.waitForTimeout(200);
  }

  async waitForMoreTransactions(initialCount: number): Promise<void> {
    await this.page.waitForFunction(
      (count) => document.querySelectorAll('.bg-secondary\\/50.rounded-xl').length > count,
      initialCount,
      { timeout: 5000 }
    );
  }
}
