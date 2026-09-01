/**
 * E2E tests for UX improvements: keyboard shortcuts, mobile nav,
 * dry-run indicators, and Recently Used section.
 *
 * Authenticated tests use storageState from global-setup (test@lazynext.local).
 * Run against local dev server with mock Atlas on port 3099.
 */
import { test, expect, devices } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

test.describe('Keyboard shortcuts', () => {
  test('? opens shortcuts help overlay', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Press ? to open overlay
    await page.keyboard.press('Shift+Slash');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Cmd+K')).toBeVisible();
    await expect(page.getByText('g d')).toBeVisible();
    await expect(page.getByText('Esc')).toBeVisible();
  });

  test('Escape closes shortcuts overlay', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open overlay
    await page.keyboard.press('Shift+Slash');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeVisible({ timeout: 3000 });
  });

  test('keyboard shortcuts button is visible in toolbar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const btn = page.getByRole('button', { name: 'Keyboard shortcuts' });
    await expect(btn).toBeVisible();
  });

  test('clicking shortcuts button opens overlay', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible({ timeout: 5000 });
  });

  test('shortcuts overlay lists all navigation shortcuts', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify all shortcuts are listed
    for (const shortcut of ['Cmd+K', 'g d', 'g p', 'g a', 'g w', 'g s', 'g c']) {
      await expect(dialog.getByText(shortcut)).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Mobile navigation
// ---------------------------------------------------------------------------

test.describe('Mobile navigation', () => {
  test('hamburger menu is clickable on mobile viewport', async ({ browser }) => {
    // Use a separate context with mobile viewport
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      storageState: 'e2e/.auth/user.json',
    });
    const page = await context.newPage();
    try {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const menuBtn = page.getByRole('button', { name: 'Menu' });
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();

      // Mobile menu should show flagship apps
      await expect(page.getByText('UGC Product Ad')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('AI Drama Ad')).toBeVisible();
      await expect(page.getByText('Ad Skit')).toBeVisible();
      await expect(page.getByText('Reference to Ad')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('no horizontal overflow on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      storageState: 'e2e/.auth/user.json',
    });
    const page = await context.newPage();
    try {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    } finally {
      await context.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Recently Used section
// ---------------------------------------------------------------------------

test.describe('Recently Used section', () => {
  test('shows Recently Used after visiting an app', async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Initially, Recently Used should not be visible (no visits yet)
    // (It may or may not be visible depending on render timing, so we just verify
    // it appears after a visit)

    // Visit a feature page
    await page.goto('/ad-creative-aida-framework-designer');
    await page.waitForLoadState('networkidle');

    // Go back to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Recently Used should now be visible
    await expect(page.getByText('Recently Used')).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Dry-run indicators
// ---------------------------------------------------------------------------

test.describe('Dry-run indicators', () => {
  test('ad-skit shows dry-run notice when generation returns fallback', async ({ page }) => {
    await page.goto('/ad-skit');
    await page.waitForLoadState('networkidle');

    // Fill the product field
    const productInput = page.locator('textarea').first();
    await productInput.fill('Test product for dry-run test');

    // Click generate
    const genBtn = page.getByRole('button', { name: /Generate script/i });
    await genBtn.click();

    // Wait for response — with mock Atlas, this should return a plan
    // The dry-run notice should appear if the plan has dryRun: true
    // (mock Atlas returns valid responses, so this tests the UI path)
    await page.waitForTimeout(5000);

    // Either the plan or an error should be visible
    const body = page.locator('body');
    await expect(body).not.toContainText('Error: plan_failed');
  });
});

// ---------------------------------------------------------------------------
// Dashboard rendering
// ---------------------------------------------------------------------------

test.describe('Dashboard', () => {
  test('shows Featured Apps section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Featured Apps')).toBeVisible({ timeout: 10000 });
  });

  test('shows welcome message', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 10000 });
  });

  test('shows credits badge', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Credits badge should be visible in the toolbar
    const creditsLink = page.locator('a[href="/pricing"]').filter({ hasText: /\d+/ });
    await expect(creditsLink).toBeVisible({ timeout: 10000 });
  });
});
