import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ReportPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Summary cards
  getTotalBalanceCard(): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-2xl').filter({ hasText: /total.*balance|общий.*баланс/i });
  }

  getTotalBalanceAmount(): Locator {
    return this.getTotalBalanceCard().locator('.text-2xl.font-bold');
  }

  getIncomeCard(): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-2xl').filter({ hasText: /^(?=.*income|.*доход)(?!.*expense|.*расход)/i }).first();
  }

  getIncomeAmount(): Locator {
    return this.getIncomeCard().locator('.text-xl.font-bold');
  }

  getExpensesCard(): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-2xl').filter({ hasText: /expense|расход/i }).first();
  }

  getExpensesAmount(): Locator {
    return this.getExpensesCard().locator('.text-xl.font-bold');
  }

  getNetFlowCard(): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-2xl').filter({ hasText: /net.*flow|чистый.*поток/i });
  }

  getNetFlowAmount(): Locator {
    return this.getNetFlowCard().locator('.text-xl.font-bold');
  }

  // Spending by category section
  getSpendingByCategorySection(): Locator {
    return this.page.locator('h3').filter({ hasText: /spending.*category|расходы.*категори/i }).locator('..');
  }

  getCategoryPieChart(): Locator {
    return this.page.locator('[style*="conic-gradient"]');
  }

  getCategoryLegendItems(): Locator {
    return this.getSpendingByCategorySection().locator('.flex.items-center.justify-between');
  }

  async getCategoryLegendItem(categoryName: string): Promise<Locator> {
    return this.getSpendingByCategorySection().locator('.flex.items-center.justify-between').filter({ hasText: categoryName });
  }

  // 6-month trend section
  getTrendSection(): Locator {
    return this.page.locator('h3').filter({ hasText: /6.*month|месяц.*тренд/i }).locator('..');
  }

  getTrendBars(): Locator {
    return this.getTrendSection().locator('.flex.items-end.gap-1 > div');
  }

  getTrendLegend(): Locator {
    return this.getTrendSection().locator('.flex.items-center.justify-center.gap-4');
  }

  // Loan status section (only visible if loans exist)
  getLoanStatusSection(): Locator {
    return this.page.locator('h3').filter({ hasText: /loan.*status|статус.*долг/i }).locator('..');
  }

  getOwedToYouAmount(): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-2xl').filter({ hasText: /owed.*you|вам.*должны/i }).locator('.text-xl.font-bold');
  }

  getYouOweAmount(): Locator {
    return this.page.locator('.bg-secondary\\/50.rounded-2xl').filter({ hasText: /you.*owe|вы.*должны/i }).locator('.text-xl.font-bold');
  }

  // Month navigation (MonthSelector component)
  getMonthSelector(): Locator {
    return this.page.locator('.flex.items-center.justify-between.px-4').filter({ has: this.page.locator('button') });
  }

  getPreviousMonthButton(): Locator {
    return this.getMonthSelector().locator('button').first();
  }

  getNextMonthButton(): Locator {
    return this.getMonthSelector().locator('button').last();
  }

  getCurrentMonthText(): Locator {
    return this.getMonthSelector().locator('h2.text-lg.font-semibold');
  }

  async goToPreviousMonth(): Promise<void> {
    await this.getPreviousMonthButton().click();
    await this.page.waitForTimeout(300);
  }

  async goToNextMonth(): Promise<void> {
    await this.getNextMonthButton().click();
    await this.page.waitForTimeout(300);
  }

  // Empty state messages
  getNoExpenseDataMessage(): Locator {
    return this.page.locator('text=/no.*expense.*data|нет.*данных.*расход/i');
  }

  getNoTransactionDataMessage(): Locator {
    return this.page.locator('text=/no.*transaction.*data|нет.*данных.*транзакц/i');
  }
}
