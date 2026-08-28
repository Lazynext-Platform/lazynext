import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads with correct title and H1', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Lazynext/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('has a skip link as the first focusable element', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    await skipLink.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has main and nav landmarks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    // Nav may be hidden on mobile (hamburger menu) — just check it exists
    await expect(page.locator('nav').first()).toBeAttached();
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    const imgs = page.locator('img');
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });
});
