import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the Creative Studio page.
 *
 * The page is client-rendered with useSession(). When unauthenticated,
 * it shows a sign-in prompt. These tests verify the page loads, has the
 * correct title, no horizontal overflow, and shows the sign-in prompt
 * (matching the pattern of existing studio E2E tests).
 *
 * Authenticated tests would require setting up NextAuth credentials
 * in the test database — the existing studio tests don't do this either.
 */

test.describe('Creative Studio Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/creative-studio');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('shows sign-in prompt when unauthenticated', async ({ page }) => {
    await page.goto('/creative-studio');
    await page.waitForTimeout(2000);
    // Should show the lock emoji and sign-in button
    await expect(page.locator('text=🔐')).toBeVisible();
    // The main content sign-in button (not the header toolbar one)
    await expect(page.locator('#main-content').getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-studio');
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creative-studio');
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('page has data-theme attribute', async ({ page }) => {
    await page.goto('/creative-studio');
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });
});

test.describe('Creative Studio Route', () => {
  test('returns 200', async ({ request }) => {
    const res = await request.get('/creative-studio');
    expect(res.status()).toBe(200);
  });
});
