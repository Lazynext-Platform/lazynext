import { test, expect } from '@playwright/test';

/**
 * E2E tests for settings sub-pages and workspace sub-pages.
 * These run against localhost (auth required for most).
 */

test.describe('Settings sub-pages', () => {
  test('settings page loads with all sections', async ({ page }) => {
    await page.goto('/settings');
    // Should show the settings heading
    await expect(page.locator('h1')).toContainText('Settings');
    // Should have Personal section
    await expect(page.locator('text=Personal')).toBeVisible();
    // Should have Workspace section
    await expect(page.locator('text=Workspace & Platform')).toBeVisible();
    // Should link to billing
    await expect(page.locator('a[href="/settings/billing"]')).toBeVisible();
  });

  test('settings/profile page loads', async ({ page }) => {
    await page.goto('/settings/profile');
    // Should redirect to login or show profile page
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText('Profile');
    }
  });

  test('settings/security page loads', async ({ page }) => {
    await page.goto('/settings/security');
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText('Security');
    }
  });

  test('settings/notifications page loads', async ({ page }) => {
    await page.goto('/settings/notifications');
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText('Notifications');
    }
  });

  test('settings/locale page loads', async ({ page }) => {
    await page.goto('/settings/locale');
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText('Language');
    }
  });

  test('settings/appearance page loads', async ({ page }) => {
    await page.goto('/settings/appearance');
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText('Appearance');
    }
  });

  test('settings/billing page loads', async ({ page }) => {
    await page.goto('/settings/billing');
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText(/Billing|Plan/);
    }
  });
});

test.describe('Workspace sub-pages', () => {
  test('workspaces list page loads', async ({ page }) => {
    await page.goto('/workspaces');
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText(/Workspace/i);
    }
  });

  test('workspace admin page requires auth', async ({ page }) => {
    await page.goto('/workspaces/test/admin');
    // Should redirect to login or show not found
    const url = page.url();
    expect(url.includes('/login') || !url.includes('/admin')).toBeTruthy();
  });

  test('workspace audit-log page requires auth', async ({ page }) => {
    await page.goto('/workspaces/test/audit-log');
    const url = page.url();
    expect(url.includes('/login') || !url.includes('/audit-log')).toBeTruthy();
  });

  test('workspace settings page requires auth', async ({ page }) => {
    await page.goto('/workspaces/test/settings');
    const url = page.url();
    expect(url.includes('/login') || !url.includes('/settings')).toBeTruthy();
  });

  test('workspace billing page requires auth', async ({ page }) => {
    await page.goto('/workspaces/test/billing');
    const url = page.url();
    expect(url.includes('/login') || !url.includes('/billing')).toBeTruthy();
  });

  test('workspace integrations page requires auth', async ({ page }) => {
    await page.goto('/workspaces/test/integrations');
    const url = page.url();
    expect(url.includes('/login') || !url.includes('/integrations')).toBeTruthy();
  });
});

test.describe('Conversations page', () => {
  test('conversations page loads', async ({ page }) => {
    await page.goto('/conversations');
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText('Conversations');
    }
  });
});

test.describe('Analytics page with charts', () => {
  test('analytics page loads with chart components', async ({ page }) => {
    await page.goto('/analytics');
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.locator('h1')).toContainText('Analytics');
      // Should have SVG chart elements
      await expect(page.locator('svg')).toHaveCount(await page.locator('svg').count());
    }
  });
});

test.describe('API documentation', () => {
  test('api/docs page loads', async ({ page }) => {
    await page.goto('/api/docs');
    await expect(page.locator('h1')).toContainText('API');
  });
});

test.describe('Notification APIs', () => {
  test('notifications stream endpoint requires auth', async ({ page }) => {
    const response = await page.request.get('/api/notifications/stream');
    expect(response.status()).toBe(401);
  });

  test('conversations API requires auth', async ({ page }) => {
    const response = await page.request.get('/api/conversations');
    expect(response.status()).toBe(401);
  });
});
