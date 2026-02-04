import type { Page } from '@playwright/test';
import type {
  TestAccount,
  TestCategory,
  TestIncomeSource,
  TestLoan,
} from '../fixtures/test-data';

export class IndexedDBHelper {
  constructor(private page: Page) {}

  async clearDatabase(): Promise<void> {
    await this.page.evaluate(async () => {
      const { db } = await import('/src/database/db.ts');
      await db.transaction(
        'rw',
        [
          db.accounts,
          db.categories,
          db.incomeSources,
          db.transactions,
          db.loans,
          db.investments,
          db.customCurrencies,
          db.settings,
        ],
        async () => {
          await db.accounts.clear();
          await db.categories.clear();
          await db.incomeSources.clear();
          await db.transactions.clear();
          await db.loans.clear();
          await db.investments.clear();
          await db.customCurrencies.clear();
          await db.settings.clear();
        }
      );
    });
  }

  async seedAccount(account: TestAccount): Promise<number> {
    return this.page.evaluate(async (acc) => {
      const { db } = await import('/src/database/db.ts');
      const now = new Date();
      return db.accounts.add({
        ...acc,
        createdAt: now,
        updatedAt: now,
      });
    }, account);
  }

  async seedCategory(category: TestCategory): Promise<number> {
    return this.page.evaluate(async (cat) => {
      const { db } = await import('/src/database/db.ts');
      const now = new Date();
      return db.categories.add({
        ...cat,
        createdAt: now,
        updatedAt: now,
      });
    }, category);
  }

  async seedIncomeSource(incomeSource: TestIncomeSource): Promise<number> {
    return this.page.evaluate(async (src) => {
      const { db } = await import('/src/database/db.ts');
      const now = new Date();
      return db.incomeSources.add({
        ...src,
        createdAt: now,
        updatedAt: now,
      });
    }, incomeSource);
  }

  async seedLoan(loan: TestLoan): Promise<number> {
    return this.page.evaluate(async (l) => {
      const { db } = await import('/src/database/db.ts');
      const now = new Date();
      return db.loans.add({
        ...l,
        dueDate: l.dueDate ? new Date(l.dueDate) : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }, { ...loan, dueDate: loan.dueDate?.toISOString() });
  }

  async getAccountBalance(accountId: number): Promise<number> {
    return this.page.evaluate(async (id) => {
      const { db } = await import('/src/database/db.ts');
      const account = await db.accounts.get(id);
      return account?.balance ?? 0;
    }, accountId);
  }

  async getLoanStatus(
    loanId: number
  ): Promise<{ paidAmount: number; status: string } | null> {
    return this.page.evaluate(async (id) => {
      const { db } = await import('/src/database/db.ts');
      const loan = await db.loans.get(id);
      if (!loan) return null;
      return { paidAmount: loan.paidAmount, status: loan.status };
    }, loanId);
  }

  async getTransactionCount(): Promise<number> {
    return this.page.evaluate(async () => {
      const { db } = await import('/src/database/db.ts');
      return db.transactions.count();
    });
  }

  async setMainCurrency(currency: string): Promise<void> {
    await this.page.evaluate(async (curr) => {
      const { db } = await import('/src/database/db.ts');
      await db.settings.put({ key: 'mainCurrency', value: curr });
    }, currency);
  }

  async setOnboardingComplete(): Promise<void> {
    await this.page.evaluate(async () => {
      const { db } = await import('/src/database/db.ts');
      await db.settings.put({ key: 'onboardingComplete', value: true });
    });
  }

  async refreshStoreData(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      await useAppStore.getState().loadAllData();
    });
  }
}
