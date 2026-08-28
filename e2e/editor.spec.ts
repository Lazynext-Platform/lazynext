import { test, expect } from '@playwright/test';

test.describe('Editor page (/editor)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/editor');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('[data-theme]')).toHaveCount(1);
  });

  test('has exactly one h1', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('has three tabs: Rough Cut, Skills, Timeline', async ({ page }) => {
    await page.goto('/editor');
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);
  });

  test('rough cut tab is active by default', async ({ page }) => {
    await page.goto('/editor');
    const firstTab = page.locator('[role="tab"]').first();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  test('has transcript textarea on rough cut tab', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('#transcript')).toHaveCount(1);
  });

  test('has generate button on rough cut tab', async ({ page }) => {
    await page.goto('/editor');
    // The generate button is the one with Scissors icon (not a tab)
    const btn = page.locator('section button').filter({ hasNot: page.locator('[role="tab"]') }).first();
    await expect(btn).toBeVisible();
  });

  test('can switch to skills tab', async ({ page }) => {
    await page.goto('/editor');
    const skillsTab = page.locator('[role="tab"]').nth(1);
    await skillsTab.click();
    await expect(skillsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to timeline tab', async ({ page }) => {
    await page.goto('/editor');
    const timelineTab = page.locator('[role="tab"]').nth(2);
    await timelineTab.click();
    await expect(timelineTab).toHaveAttribute('aria-selected', 'true');
  });

  test('timeline tab has name input', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('[role="tab"]').nth(2).click();
    await expect(page.locator('#tlName')).toHaveCount(1);
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/editor');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/editor');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/editor');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('all textareas have accessible names', async ({ page }) => {
    await page.goto('/editor');
    const textareas = page.locator('textarea');
    const count = await textareas.count();
    for (let i = 0; i < count; i++) {
      const ta = textareas.nth(i);
      const ariaLabel = await ta.getAttribute('aria-label');
      const id = await ta.getAttribute('id');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(ariaLabel || hasLabel, `textarea ${i} should have accessible name`).toBeTruthy();
    }
  });

  test('all selects have accessible names', async ({ page }) => {
    await page.goto('/editor');
    // Switch to timeline tab to reveal selects
    await page.locator('[role="tab"]').nth(2).click();
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      const ariaLabel = await sel.getAttribute('aria-label');
      const id = await sel.getAttribute('id');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(ariaLabel || hasLabel, `select ${i} should have accessible name`).toBeTruthy();
    }
  });
});
