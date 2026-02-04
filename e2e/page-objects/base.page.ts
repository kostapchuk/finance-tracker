import type { Page, Locator } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async navigateTo(view: 'dashboard' | 'history' | 'loans' | 'report' | 'settings'): Promise<void> {
    const navButton = this.page.locator('nav button').filter({ hasText: new RegExp(view, 'i') });
    await navButton.click();
    await this.page.waitForTimeout(300);
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
  }

  getNavButton(view: string): Locator {
    return this.page.locator('nav button').filter({ hasText: new RegExp(view, 'i') });
  }

  async isViewActive(view: string): Promise<boolean> {
    const button = this.getNavButton(view);
    const className = await button.getAttribute('class');
    return className?.includes('text-primary') ?? false;
  }
}
