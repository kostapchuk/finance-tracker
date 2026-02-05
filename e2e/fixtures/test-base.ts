import { test as base } from '@playwright/test';
import { IndexedDBHelper } from '../helpers/indexeddb.helper';
import { DashboardPage } from '../page-objects/dashboard.page';
import { HistoryPage } from '../page-objects/history.page';
import { LoansPage } from '../page-objects/loans.page';
import { SettingsPage } from '../page-objects/settings.page';

type TestFixtures = {
  dbHelper: IndexedDBHelper;
  dashboardPage: DashboardPage;
  historyPage: HistoryPage;
  loansPage: LoansPage;
  settingsPage: SettingsPage;
  setupCleanState: () => Promise<void>;
};

export const test = base.extend<TestFixtures>({
  dbHelper: async ({ page }, use) => {
    const helper = new IndexedDBHelper(page);
    await use(helper);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  historyPage: async ({ page }, use) => {
    const historyPage = new HistoryPage(page);
    await use(historyPage);
  },

  loansPage: async ({ page }, use) => {
    const loansPage = new LoansPage(page);
    await use(loansPage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  setupCleanState: async ({ page, dbHelper }, use) => {
    const setup = async () => {
      // 1. Navigate to app to initialize the database
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 2. Clear all data
      await dbHelper.clearDatabase();

      // 3. Set required settings (AFTER clearing)
      await dbHelper.setMainCurrency('USD');
      await dbHelper.setOnboardingComplete();

      // 4. Reload to pick up clean state
      await page.reload();
      await page.waitForLoadState('networkidle');
    };
    await use(setup);
  },
});

export { expect } from '@playwright/test';
