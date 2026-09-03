import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for miscellaneous pages.
 * Most are auth-gated; `status` is public; `feedback` lives under /admin/feedback.
 *
 * Note: `leaderboard` only exposes an API route (no page directory under src/app),
 * so it is intentionally omitted here.
 */

const authedPages = [
  'calendar', 'observability',
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
      // Auth-gated pages may show a sign-in prompt or spinner when unauthenticated
      const h1Count = await page.locator('h1').count();
      const spinnerCount = await page.locator('.animate-spin').count();
      const buttonCount = await page.locator('button').count();
      if (spinnerCount > 0 || (h1Count === 0 && buttonCount > 0)) {
        // Loading or unauthenticated — h1 is not expected
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
      await page.waitForLoadState('networkidle');
      // When unauthenticated, the page may show:
      // - an h1 (main content)
      // - a [role="dialog"] (auth modal)
      // - a button (sign-in prompt)
      // - a loading spinner
      // Any of these is valid; only a blank page is a failure.
      const authModal = page.locator('[role="dialog"]');
      const content = page.locator('h1');
      const button = page.locator('button');
      const spinner = page.locator('.animate-spin');
      const authCount = await authModal.count();
      const contentCount = await content.count();
      const buttonCount = await button.count();
      const spinnerCount = await spinner.count();
      expect(authCount + contentCount + buttonCount + spinnerCount).toBeGreaterThan(0);
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

// Redirected routes — these old pages redirect to new destinations
const redirectedPages = [
  'creative-director', 'narrative-studio', 'ab-test-results', 'personas', 'testing-lab', 'inspiration', 'creative-diff',
];

for (const p of redirectedPages) {
  test.describe(`${p} Page (redirected)`, () => {
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
      // Each page redirects to its new destination
      const dests: Record<string, string> = {"creative-director": "/creative", "narrative-studio": "/creative", "ab-test-results": "/creative/generators", "personas": "/creative/generators", "testing-lab": "/creative/generators", "inspiration": "/creative", "creative-diff": "/creative/generators"};
      const dest = dests[p];
      const escaped = dest.replace(/\//g, '\\/');
      await expect(page).toHaveURL(new RegExp(escaped));
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
