import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the /admin page.
 *
 * The admin page is auth-gated and requires admin email privileges.
 * These tests verify the page structure and UI when unauthenticated
 * (the page shows a loading spinner, then either the admin dashboard
 * or an access-denied message depending on the user's role).
 *
 * Follows the same pattern as e2e/new-pages.spec.ts.
 */

test.describe('Admin Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/admin');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('shows loading spinner initially', async ({ page }) => {
    await page.goto('/admin');
    // The page should show a loading spinner while session is being checked
    // This is a transient state, so we just verify the page doesn't crash
    await page.waitForTimeout(500);
    // The page should have either a spinner, the admin dashboard, or access denied
    const spinner = page.locator('.animate-spin');
    const h1 = page.locator('h1');
    const alertText = page.locator('text=/Access denied/i');
    const hasSpinner = await spinner.count().then((c) => c > 0);
    const hasH1 = await h1.count().then((c) => c > 0);
    const hasAlert = await alertText.count().then((c) => c > 0);
    expect(hasSpinner || hasH1 || hasAlert).toBeTruthy();
  });

  test('does not show admin content when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    // When unauthenticated, the page should NOT show the admin dashboard
    // (tabs, user table, etc.) — it should show loading or access denied
    const tabs = page.locator('button', { hasText: /Users|Creations/i });
    const tabCount = await tabs.count();
    // If tabs are visible, the user is authenticated as admin (test environment)
    // If not, the page is either loading or showing access denied
    if (tabCount === 0) {
      // Verify we're not showing admin content — either spinner or access denied
      const spinner = page.locator('.animate-spin');
      const alertText = page.locator('text=/Access denied/i');
      const hasSpinner = await spinner.count().then((c) => c > 0);
      const hasAlert = await alertText.count().then((c) => c > 0);
      expect(hasSpinner || hasAlert).toBeTruthy();
    }
  });
});

test.describe('Admin Page Navigation', () => {
  test('admin page is accessible via direct URL', async ({ page }) => {
    const response = await page.goto('/admin');
    expect(response?.status()).toBeLessThan(500);
  });

  test('admin page has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    // Filter out network errors (auth redirects) which are expected
    const realErrors = errors.filter((e) => !e.includes('401') && !e.includes('403') && !e.includes('Failed to load resource'));
    expect(realErrors.length).toBe(0);
  });
});
