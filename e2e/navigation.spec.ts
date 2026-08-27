import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test('has 3 pricing tier H2 headings', async ({ page }) => {
    await page.goto('/pricing');
    const h2s = page.locator('h2');
    await expect(h2s).toHaveCount(3);
  });
});

test.describe('404 Page', () => {
  test('returns 404 with proper content', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('SEO Endpoints', () => {
  test('robots.txt is accessible', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  test('sitemap.xml is accessible', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('hreflang');
  });
});

test.describe('Auth', () => {
  test('sign-in dialog opens with proper ARIA', async ({ page }) => {
    await page.goto('/');
    // Look for sign-in button (text varies by locale)
    const signInBtn = page.locator('button', { hasText: /sign in|登录|Sign In/i }).first();
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      // Should have email and password inputs
      await expect(dialog.locator('input[type="email"], input[autocomplete="email"]')).toBeVisible();
      await expect(dialog.locator('input[type="password"]')).toBeVisible();
    }
  });
});

test.describe('Theme Switching', () => {
  test('page has data-theme attribute', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });
});

test.describe('Cookie Consent', () => {
  test('cookie banner appears and can be accepted', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Look for cookie banner dialog
    const banner = page.locator('[role="dialog"]').filter({ hasText: /cookie|consent|同意|拒绝/i }).first();
    if (await banner.isVisible()) {
      // Accept button
      const acceptBtn = banner.locator('button').first();
      await acceptBtn.click();
      await page.waitForTimeout(500);
      await expect(banner).not.toBeVisible();
    }
  });
});
