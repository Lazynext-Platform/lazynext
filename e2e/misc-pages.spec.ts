import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for miscellaneous pages.
 * Most are auth-gated; `status` is public; `feedback` lives under /admin/feedback.
 *
 * Note: `leaderboard` only exposes an API route (no page directory under src/app),
 * so it is intentionally omitted here.
 */

const authedPages = [
  'ab-test-results',
  'calendar',
  'creative-diff',
  'creative-director',
  'inspiration',
  'narrative-studio',
  'observability',
  'personas',
  'testing-lab',
];

for (const p of authedPages) {
  test.describe(`${p} Page`, () => {
    test('loads with correct title', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveTitle(/Lazynext/i);
    });

    test('has one h1', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('h1')).toHaveCount(1);
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
      const authModal = page.locator('[role="dialog"]');
      const content = page.locator('h1');
      const authCount = await authModal.count();
      const contentCount = await content.count();
      expect(authCount + contentCount).toBeGreaterThan(0);
    });
  });
}

test.describe('status Page (public)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/status');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });

  test('is reachable via direct navigation', async ({ page }) => {
    await page.goto('/status');
    await expect(page).toHaveURL(/\/status/);
  });

  test('renders main content', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('feedback Page (admin)', () => {
  test('is reachable and redirects or renders', async ({ page }) => {
    await page.goto('/admin/feedback');
    // Admin page either renders content or redirects to auth.
    await expect(page).toHaveURL(/(admin\/feedback|auth|sign-in|login)/i);
  });

  test('has auth gate or main content', async ({ page }) => {
    await page.goto('/admin/feedback');
    const authModal = page.locator('[role="dialog"]');
    const content = page.locator('h1');
    const authCount = await authModal.count();
    const contentCount = await content.count();
    expect(authCount + contentCount).toBeGreaterThan(0);
  });
});
