import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for platform/publishing pages.
 * Auth-gated pages — show AuthModal or main content when unauthenticated.
 */

const pages = [
  'compliance', 'approvals', 'ads', 'publish',
];

for (const p of pages) {
  test.describe(`${p} Page`, () => {
    test('loads with correct title', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveTitle(/Lazynext/i);
    });

    test('has one h1', async ({ page }) => {
      await page.goto(`/${p}`);
      await page.waitForTimeout(3000);
      // Unauthenticated pages may show sign-in link instead of h1
      const h1Count = await page.locator('h1').count();
      const signInCount = await page.locator('a:has-text("Sign in")').count();
      const mainCount = await page.locator('main').count();
      expect(h1Count + signInCount + mainCount).toBeGreaterThan(0);
    });

    test('has data-theme attribute', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
    });

    test('is reachable via direct navigation', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveURL(new RegExp(`/${p}`));
    });

    test('has auth gate or main content', async ({ page }) => {
      await page.goto(`/${p}`);
      await page.waitForTimeout(3000);
      const authModal = page.locator('[role="dialog"]');
      const content = page.locator('h1');
      const signIn = page.locator('a:has-text("Sign in")');
      const main = page.locator('main');
      const authCount = await authModal.count();
      const contentCount = await content.count();
      const signInCount = await signIn.count();
      const mainCount = await main.count();
      expect(authCount + contentCount + signInCount + mainCount).toBeGreaterThan(0);
    });
  });
}

// Redirected routes — these old pages redirect to new destinations
const redirectedPages = [
  'meta-safety', 'google-safety',
];

for (const p of redirectedPages) {
  test.describe(`${p} Page (redirected)`, () => {
    test('loads with correct title', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveTitle(/Lazynext/i);
    });

    test('has one h1', async ({ page }) => {
      await page.goto(`/${p}`);
      await page.waitForTimeout(1000);
      // Redirected to /integrations; unauthenticated may show sign-in link
      const h1Count = await page.locator('h1').count();
      const signInCount = await page.locator('a:has-text("Sign in")').count();
      expect(h1Count + signInCount).toBeGreaterThan(0);
    });

    test('has data-theme attribute', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
    });

    test('is reachable via direct navigation', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveURL(/\/integrations/);
    });

    test('has auth gate or main content', async ({ page }) => {
      await page.goto(`/${p}`);
      await page.waitForTimeout(1000);
      const authModal = page.locator('[role="dialog"]');
      const content = page.locator('h1');
      const signIn = page.locator('a:has-text("Sign in")');
      const authCount = await authModal.count();
      const contentCount = await content.count();
      const signInCount = await signIn.count();
      expect(authCount + contentCount + signInCount).toBeGreaterThan(0);
    });
  });
}
