import { test, expect } from '@playwright/test';

test.describe('Lazynext Studio', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/lazynext-studio');
    await expect(page).toHaveTitle(/Lazynext/);
  });

  test('all selects have aria-labels', async ({ page }) => {
    await page.goto('/lazynext-studio');
    await page.waitForTimeout(2000);
    const selects = page.locator('select:visible');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const label = await selects.nth(i).getAttribute('aria-label');
      const title = await selects.nth(i).getAttribute('title');
      expect(label || title).not.toBeNull();
    }
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/lazynext-studio');
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Drama Studio', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/drama-studio');
    await expect(page).toHaveTitle(/Lazynext/);
  });

  test('all selects have aria-labels', async ({ page }) => {
    await page.goto('/drama-studio');
    await page.waitForTimeout(2000);
    const selects = page.locator('select:visible');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const label = await selects.nth(i).getAttribute('aria-label');
      const title = await selects.nth(i).getAttribute('title');
      expect(label || title).not.toBeNull();
    }
  });
});

test.describe('Ad-Skit', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/ad-skit');
    await expect(page).toHaveTitle(/Lazynext/);
  });

  test('all selects have aria-labels', async ({ page }) => {
    await page.goto('/ad-skit');
    await page.waitForTimeout(2000);
    const selects = page.locator('select:visible');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const label = await selects.nth(i).getAttribute('aria-label');
      const title = await selects.nth(i).getAttribute('title');
      expect(label || title).not.toBeNull();
    }
  });
});

test.describe('Ad-Reference', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/ad-reference');
    await expect(page).toHaveTitle(/Lazynext/);
  });
});
