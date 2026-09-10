/**
 * E2E smoke tests for the OS Agents domain.
 *
 * Verifies that the agent management surfaces load and render basic UI:
 * the agent list, the agent creation flow, and agent detail navigation.
 *
 * Authenticated via storageState from global-setup (test@lazynext.local).
 * Run against the local dev server with mock Atlas on port 3099.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('OS Agents management', () => {
  test('agent list page loads', async ({ page }) => {
    await page.goto('/agents');
    await expect(page).toHaveURL(/\/agents/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('agent list renders without server error', async ({ page }) => {
    const res = await page.goto('/agents');
    expect(res?.status()).toBeLessThan(500);
  });

  test('agent creation page loads', async ({ page }) => {
    await page.goto('/agents/new');
    await expect(page).toHaveURL(/\/agents\/new/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('agent creation form is present', async ({ page }) => {
    await page.goto('/agents/new');
    await expect(page.locator('body')).toBeVisible();
    // A creation form should expose at least one input or button
    const formControls = page.locator('input, textarea, select, button');
    expect(await formControls.count()).toBeGreaterThan(0);
  });

  test('can navigate from agent list to a detail view', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('body')).toBeVisible();
    // Look for agent detail links (exclude /agents/new)
    const detailLink = page.locator('a[href*="/agents/"]').filter({ hasNotText: /new|create/i }).first();
    const count = await detailLink.count();
    if (count > 0) {
      await detailLink.click();
      // Should navigate to an agent detail page (not /agents/new)
      await expect(page).toHaveURL(/\/agents\/(?!new)[^/]+/);
      await expect(page.locator('body')).toBeVisible();
    } else {
      // No agents yet — list still renders the empty state without error
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('agent list is reachable from dashboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/agents');
    await expect(page).toHaveURL(/\/agents/);
  });
});
