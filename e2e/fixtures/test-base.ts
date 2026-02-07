/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test';
import { IndexedDBHelper } from '../helpers/indexeddb.helper';
import { DashboardPage } from '../page-objects/dashboard.page';
import { HistoryPage } from '../page-objects/history.page';
import { LoansPage } from '../page-objects/loans.page';
import { SettingsPage } from '../page-objects/settings.page';
import { ReportPage } from '../page-objects/report.page';

type TestFixtures = {
  dbHelper: IndexedDBHelper;
  dashboardPage: DashboardPage;
  historyPage: HistoryPage;
  loansPage: LoansPage;
  settingsPage: SettingsPage;
  reportPage: ReportPage;
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

  reportPage: async ({ page }, use) => {
    const reportPage = new ReportPage(page);
    await use(reportPage);
  },

  setupCleanState: async ({ page, dbHelper }, use) => {
    const setup = async () => {
      // 1. Set language to English and onboarding complete in localStorage BEFORE navigating
      await page.addInitScript(() => {
        localStorage.setItem('finance-tracker-language', 'en');
        localStorage.setItem('finance-tracker-onboarding-completed', 'true');
      });

      // 2. Navigate to app to initialize the database
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 3. Clear all data
      await dbHelper.clearDatabase();

      // 4. Set required settings (AFTER clearing)
      await dbHelper.setMainCurrency('USD');

      // 5. Reload to pick up clean state
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 6. Dismiss onboarding if still visible (click Skip button)
      const skipButton = page.getByText('Skip');
      if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipButton.click();
        await page.waitForTimeout(300);
      }
    };
    await use(setup);
  },
});

export { expect } from '@playwright/test';
