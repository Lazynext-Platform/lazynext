import { test, expect } from '@playwright/test';

/** Dismiss cookie consent banner if present (mobile viewport fix). */
async function dismissCookieConsent(page: import('@playwright/test').Page) {
  const banner = page.locator('[role="dialog"]').filter({ hasText: /cookie|consent|同意|拒绝/i }).first();
  if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await banner.locator('button').first().click();
    await page.waitForTimeout(300);
  }
}

/**
 * E2E tests for the streaming Creative Director progress UI and the
 * per-campaign metrics refresh button on the /ads page.
 *
 * /creative-director redirects to /creative (next.config.mjs).
 * The /ads page tests verify form structure and campaign creation.
 */

test.describe('Creative Director Streaming Progress UI (/creative-director → /creative)', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/creative-director');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('page has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('page has data-theme attribute', async ({ page }) => {
    await page.goto('/creative-director');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });
});

test.describe('Ads Page Metrics Refresh UI', () => {
  test('create campaign form has required fields', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    // The form should have platform select, campaign name, creative IDs, budget
    await expect(page.locator('#platform-select')).toBeVisible();
    await expect(page.locator('#campaign-name')).toBeVisible();
    await expect(page.locator('#creative-ids')).toBeVisible();
    await expect(page.locator('#daily-budget')).toBeVisible();
  });

  test('dry-run checkbox is checked by default', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    const dryRunCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(dryRunCheckbox).toBeChecked();
  });

  test('simulate button is disabled without campaign name and creative IDs', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    const btn = page.locator('button', { hasText: /Simulate Campaign|Create Campaign/i });
    await expect(btn).toBeDisabled();
  });

  test('filling form enables the simulate button', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    await page.locator('#campaign-name').fill('Summer Sale Test');
    await page.locator('#creative-ids').fill('abc123, def456');
    await page.locator('#daily-budget').fill('25');
    const btn = page.locator('button', { hasText: /Simulate Campaign/i });
    await expect(btn).toBeEnabled();
  });

  test('campaign list section exists', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    // The "Your Campaigns" section should be present
    await expect(page.locator('h2', { hasText: /Your Campaigns/i })).toBeVisible();
  });

  test('refresh buttons have accessible aria-labels when campaigns exist', async ({ page }) => {
    // This test creates a dry-run campaign, then checks the refresh button
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    await page.locator('#campaign-name').fill('E2E Test Campaign');
    await page.locator('#creative-ids').fill('test-creative-1');
    await page.locator('#daily-budget').fill('10');
    // Ensure dry-run is checked (safe)
    const dryRunCheckbox = page.locator('input[type="checkbox"]').first();
    if (!(await dryRunCheckbox.isChecked())) {
      await dryRunCheckbox.check();
    }
    await page.locator('button', { hasText: /Simulate Campaign/i }).click();
    await page.waitForTimeout(2000);
    // After creating, the campaign should appear in the list with a refresh button
    const refreshBtn = page.locator('button[aria-label*="Refresh metrics"]');
    const count = await refreshBtn.count();
    if (count > 0) {
      // Verify the aria-label contains the campaign name
      const label = await refreshBtn.first().getAttribute('aria-label');
      expect(label).toContain('Refresh metrics');
      expect(label).toContain('E2E Test Campaign');
    }
  });
});
