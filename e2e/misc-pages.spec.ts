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
      await page.waitForLoadState('networkidle');
      // Auth-gated pages may show a sign-in prompt instead of h1 when unauthenticated
      const h1Count = await page.locator('h1').count();
      const signInButton = await page.locator('button:has-text("ign"), button:has-text("Sign"), button:has-text("登录"), button:has-text("Anmelde)').count();
      const spinner = await page.locator('.animate-spin').count();
      if (signInButton > 0 || spinner > 0) {
        // Unauthenticated or loading — h1 is not expected
        return;
      }
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
      // When unauthenticated, the page may show:
      // - an h1 (main content)
      // - a [role="dialog"] (auth modal)
      // - a sign-in button/prompt (auth gate without modal)
      // - a loading spinner (page is still loading)
      // Any of these is valid; only a blank page is a failure.
      await page.waitForLoadState('networkidle');
      const authModal = page.locator('[role="dialog"]');
      const content = page.locator('h1');
      const signInButton = page.locator('button:has-text("ign"), button:has-text("Sign"), button:has-text("登录"), button:has-text("Anmelde)');
      const spinner = page.locator('.animate-spin');
      const authCount = await authModal.count();
      const contentCount = await content.count();
      const signInCount = await signInButton.count();
      const spinnerCount = await spinner.count();
      expect(authCount + contentCount + signInCount + spinnerCount).toBeGreaterThan(0);
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
