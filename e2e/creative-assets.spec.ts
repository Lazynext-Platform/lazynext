import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the /creative-assets browsing page.
 *
 * Follows the same pattern as e2e/new-pages.spec.ts:
 * - Page loads with correct title
 * - Shows sign-in prompt when unauthenticated
 * - No horizontal overflow at narrow and wide viewports
 * - Has data-theme attribute
 * - Has exactly one h1
 * - Has #main-content
 * - Nav link to /creative-assets is present in the header on desktop
 */

test.describe('Creative Assets Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/creative-assets');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1 with Creative Assets text', async ({ page }) => {
    await page.goto('/creative-assets');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/Creative Assets/i);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-assets');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creative-assets');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/creative-assets');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/creative-assets');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('shows sign-in prompt when unauthenticated', async ({ page }) => {
    await page.goto('/creative-assets');
    await page.waitForTimeout(1000);
    // Should show a Sign in button in the main content (auth-gated)
    await expect(page.locator('#main-content').getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('does not show asset list when unauthenticated', async ({ page }) => {
    await page.goto('/creative-assets');
    await page.waitForTimeout(1000);
    // Should not show the filter bar or package list
    await expect(page.locator('h2', { hasText: /Standalone Assets/i })).toHaveCount(0);
  });
});

test.describe('Creative Assets Navigation', () => {
  test('Assets nav link is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Assets' })).toBeVisible();
  });

  test('clicking Assets nav link navigates to /creative-assets', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.locator('nav[aria-label="Primary"] a', { hasText: 'Assets' }).click();
    await expect(page).toHaveURL(/\/creative-assets/);
  });
});
