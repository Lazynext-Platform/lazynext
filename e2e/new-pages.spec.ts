import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the three new pages added in the ad-platforms/director/performance phase.
 *
 * These tests follow the same pattern as e2e/creative-studio.spec.ts:
 * - Page loads with correct title
 * - Shows appropriate content when unauthenticated
 * - No horizontal overflow at narrow and wide viewports
 * - Has data-theme attribute
 * - Has exactly one h1
 * - Has #main-content
 * - Nav links are visible in the header (sm+ screens)
 */

test.describe('Creative Director Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/creative-director');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1 with Creative Director text', async ({ page }) => {
    await page.goto('/creative-director');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/Creative Director/i);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/creative-director');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/creative-director');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('shows input form elements', async ({ page }) => {
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    // Should have product URL input, platform select, budget slider
    await expect(page.locator('#product-url')).toBeVisible();
    await expect(page.locator('#platform')).toBeVisible();
    await expect(page.locator('#budget')).toBeVisible();
  });

  test('run button is disabled when no input', async ({ page }) => {
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const btn = page.locator('button', { hasText: /Run Creative Director/i });
    await expect(btn).toBeDisabled();
  });
});

test.describe('Ad Campaigns Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/ads');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1 with Ad Campaigns text', async ({ page }) => {
    await page.goto('/ads');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/Ad Campaigns/i);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/ads');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/ads');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('shows platform select and dry-run checkbox', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    await expect(page.locator('#platform-select')).toBeVisible();
    await expect(page.locator('#campaign-name')).toBeVisible();
    // Dry-run checkbox should be checked by default
    const dryRunCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(dryRunCheckbox).toBeChecked();
  });

  test('create button is disabled when no name or creative IDs', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    const btn = page.locator('button', { hasText: /Simulate Campaign|Create Campaign/i });
    await expect(btn).toBeDisabled();
  });
});

test.describe('Performance Dashboard Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/performance');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1 with Performance Dashboard text', async ({ page }) => {
    await page.goto('/performance');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/Performance Dashboard/i);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/performance');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/performance');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/performance');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/performance');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

test.describe('Header Navigation Links', () => {
  test('nav links are visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    // The primary nav should have links to Dashboard, Director, Ads, Performance
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Director' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Ads' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Performance', exact: true })).toBeVisible();
  });

  test('nav links are hidden on mobile (<768px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Primary nav should be hidden on narrow screens
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav).toBeHidden();
  });

  test('clicking Director nav link navigates to /creative-director', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.locator('nav[aria-label="Primary"] a', { hasText: 'Director' }).click();
    await expect(page).toHaveURL(/\/creative-director/);
  });

  test('clicking Ads nav link navigates to /ads', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.locator('nav[aria-label="Primary"] a', { hasText: 'Ads' }).click();
    await expect(page).toHaveURL(/\/ads/);
  });

  test('clicking Performance nav link navigates to /performance', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.locator('nav[aria-label="Primary"]').getByRole('link', { name: 'Performance', exact: true }).click();
    await expect(page).toHaveURL(/\/performance/);
  });
});
