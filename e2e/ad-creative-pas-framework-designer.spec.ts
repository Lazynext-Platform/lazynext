import { test, expect } from '@playwright/test';

test.describe('Ad Creative Pas Framework Designer Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/ad-creative-pas-framework-designer');
    await expect(page).toHaveTitle(/Lazynext/i);
  });
  test('has one h1', async ({ page }) => {
    await page.goto('/ad-creative-pas-framework-designer');
    await expect(page.locator('h1')).toHaveCount(1);
  });
  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/ad-creative-pas-framework-designer');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });
  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/ad-creative-pas-framework-designer');
    await page.waitForTimeout(500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw);
  });
  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/ad-creative-pas-framework-designer');
    await page.waitForTimeout(500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw);
  });
  test('RTL layout has no horizontal overflow', async ({ page }) => {
    await page.context().addCookies([{ name: 'locale', value: 'ar', url: 'http://localhost:3100' }]);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ad-creative-pas-framework-designer');
    await page.waitForTimeout(500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw);
  });
  test('is reachable via direct navigation', async ({ page }) => {
    await page.goto('/ad-creative-pas-framework-designer');
    await expect(page).toHaveURL(/\/creative\/generators/);
  });
  test('has auth gate or main content', async ({ page }) => {
    await page.goto('/ad-creative-pas-framework-designer');
    const authModal = page.locator('[role="dialog"]');
    const content = page.locator('h1');
    const authCount = await authModal.count();
    const contentCount = await content.count();
    expect(authCount + contentCount).toBeGreaterThan(0);
  });
});
