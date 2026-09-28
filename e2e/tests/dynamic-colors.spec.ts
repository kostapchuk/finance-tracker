import { test, expect } from '../fixtures/test-base';
import { testAccounts, testCategories } from '../fixtures/test-data';

// User-picked colors and data-driven sizes reach the DOM through CSS custom
// properties (e.g. `style="--item-color: #22c55e"` + `bg-(--item-color)/12.5`)
// instead of inline style properties. These checks make sure the browser still
// resolves them to real colors and sizes.
test.describe('Dynamic colors and sizes', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('tints the account icon with the account color', async ({ page, dbHelper }) => {
    await dbHelper.seedAccount(testAccounts.usdCash()); // #22c55e
    await dbHelper.refreshStoreData();

    const account = page.getByRole('button', { name: 'USD Cash' });
    const iconCircle = account.locator('[style*="--item-color"]');
    await expect(iconCircle).toBeVisible();

    const { background, iconColor } = await iconCircle.evaluate((el) => ({
      background: getComputedStyle(el).backgroundColor,
      iconColor: getComputedStyle(el.querySelector('svg')!).color,
    }));
    expect(iconColor).toBe('rgb(34, 197, 94)');
    // A translucent tint of the same color, not transparent or opaque.
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    expect(background).toMatch(/\/ 0\.125\)$|, 0\.125\)$/);
  });

  test('draws the report donut and trend bars from data', async ({ page, reportPage, dbHelper }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const foodId = await dbHelper.seedCategory(testCategories.food()); // #f97316
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 50,
      currency: 'USD',
      accountId,
      categoryId: foodId,
      date: new Date(),
    });
    await dbHelper.refreshStoreData();
    await reportPage.navigateTo('report');

    const donut = reportPage.getCategoryPieChart();
    await expect(donut).toBeVisible();
    const { image, mask } = await donut.evaluate((el) => {
      const style = getComputedStyle(el);
      return { image: style.backgroundImage, mask: style.maskImage || style.webkitMaskImage };
    });
    expect(image).toContain('conic-gradient');
    expect(image).toContain('rgb(249, 115, 22)');
    expect(mask).toContain('radial-gradient');

    // The only month with expenses has the tallest bar: 100% of its track.
    const tallest = page.locator('.bg-destructive[style*="--bar-height: 100%"]');
    await expect(tallest).toHaveCount(1);
    const [barHeight, trackHeight] = await tallest.evaluate((el) => [
      el.getBoundingClientRect().height,
      el.parentElement!.getBoundingClientRect().height,
    ]);
    expect(barHeight).toBeCloseTo(trackHeight, 0);
  });
});
