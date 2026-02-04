import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Income sources section
  getIncomeSources(): Locator {
    return this.page.locator('[id^="income-"]');
  }

  getIncomeSourceByName(name: string): Locator {
    return this.page.locator('[id^="income-"]').filter({ hasText: name });
  }

  // Accounts section
  getAccounts(): Locator {
    return this.page.locator('[id^="account-"]').filter({ has: this.page.locator('[class*="rounded-xl"]') });
  }

  getAccountByName(name: string): Locator {
    return this.page.locator('[id^="account-drop-"]').filter({ hasText: name });
  }

  getAccountDraggable(name: string): Locator {
    return this.page.locator('[id^="account-"]:not([id^="account-drop-"])').filter({ hasText: name });
  }

  // Categories section
  getCategories(): Locator {
    return this.page.locator('[id^="category-"]');
  }

  getCategoryByName(name: string): Locator {
    return this.page.locator('[id^="category-"]').filter({ hasText: name });
  }

  // Add buttons
  getAddIncomeSourceButton(): Locator {
    return this.page.locator('section').filter({ hasText: /income/i }).locator('[role="button"]').filter({ has: this.page.locator('svg') });
  }

  getAddAccountButton(): Locator {
    return this.page.locator('section').filter({ hasText: /accounts/i }).locator('[role="button"]').filter({ has: this.page.locator('svg') });
  }

  getAddCategoryButton(): Locator {
    return this.page.locator('section').filter({ hasText: /expenses/i }).locator('[role="button"]').filter({ has: this.page.locator('svg') });
  }

  // Drag and drop helper for @dnd-kit
  async performDragDrop(source: Locator, target: Locator): Promise<void> {
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error('Could not get bounding boxes for drag and drop');
    }

    const sourceCenter = {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2,
    };
    const targetCenter = {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2,
    };

    // Start drag
    await this.page.mouse.move(sourceCenter.x, sourceCenter.y);
    await this.page.mouse.down();

    // Move a bit to activate drag (dnd-kit needs activation distance)
    await this.page.mouse.move(sourceCenter.x + 10, sourceCenter.y, { steps: 5 });

    // Move to target
    await this.page.mouse.move(targetCenter.x, targetCenter.y, { steps: 20 });

    // Wait for drop zone to be ready
    await this.page.waitForTimeout(100);

    // Drop
    await this.page.mouse.up();

    // Wait for modal to appear
    await this.page.waitForTimeout(300);
  }

  // Drag income source to account
  async dragIncomeToAccount(incomeName: string, accountName: string): Promise<void> {
    const income = this.getIncomeSourceByName(incomeName);
    const account = this.getAccountByName(accountName);
    await this.performDragDrop(income, account);
  }

  // Drag account to category
  async dragAccountToCategory(accountName: string, categoryName: string): Promise<void> {
    const account = this.getAccountDraggable(accountName);
    const category = this.getCategoryByName(categoryName);
    await this.performDragDrop(account, category);
  }

  // Drag account to account (transfer)
  async dragAccountToAccount(fromAccountName: string, toAccountName: string): Promise<void> {
    const fromAccount = this.getAccountDraggable(fromAccountName);
    const toAccount = this.getAccountByName(toAccountName);
    await this.performDragDrop(fromAccount, toAccount);
  }

  // Expand/collapse sections
  async toggleIncomeSection(): Promise<void> {
    const button = this.page.locator('button').filter({ hasText: /income/i }).first();
    await button.click();
  }

  async toggleExpensesSection(): Promise<void> {
    const button = this.page.locator('button').filter({ hasText: /expenses/i }).first();
    await button.click();
  }

  // Month selector
  async selectMonth(monthOffset: number): Promise<void> {
    const monthSelector = this.page.locator('[class*="MonthSelector"]');
    if (monthOffset > 0) {
      for (let i = 0; i < monthOffset; i++) {
        await monthSelector.locator('button:has(svg)').last().click();
      }
    } else if (monthOffset < 0) {
      for (let i = 0; i < Math.abs(monthOffset); i++) {
        await monthSelector.locator('button:has(svg)').first().click();
      }
    }
  }
}
