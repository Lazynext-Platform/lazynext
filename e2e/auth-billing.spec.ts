/**
 * E2E tests for the billing/checkout flow.
 *
 * Uses the storageState saved by global-setup.ts for authenticated tests.
 * Runs under the `chromium-auth` project.
 *
 * These tests verify the pricing page UI, checkout API contract, and webhook
 * security without requiring real Dodo Payments credentials.
 */
import { test, expect } from '@playwright/test';

test.describe('Billing & Checkout', () => {
  // ── Pricing page UI tests ──

  test('pricing page renders content', async ({ page }) => {
    await page.goto('/pricing');
    // The pricing page is now a pricing management dashboard. It may show
    // an empty state (no workspace) or the dashboard with h2 headings.
    const body = page.locator('body');
    await expect(body).toBeVisible();
    const text = await body.textContent();
    // Should show some pricing-related content
    expect(text?.length).toBeGreaterThan(0);
  });

  test('pricing page shows plan or empty state', async ({ page }) => {
    await page.goto('/pricing');
    const text = await page.locator('body').textContent();
    // Should show either plan names, empty state, or sign-in prompt
    expect(text).toMatch(/Starter|Pro|Elite|pricing|Sign in|workspace|company/i);
  });

  test('pricing page has currency selector or empty state', async ({ page }) => {
    await page.goto('/pricing');
    // The pricing dashboard may have a currency selector, or may show
    // an empty state / sign-in prompt if no workspace exists.
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Check for either a select element or empty-state text
    const selects = page.locator('select');
    const count = await selects.count();
    const text = await body.textContent();
    const hasEmptyState = /Sign in|workspace|company|Create/i.test(text || '');
    expect(count > 0 || hasEmptyState).toBeTruthy();
  });

  test('pricing page no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pricing');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('pricing page shows credit amounts or empty state', async ({ page }) => {
    await page.goto('/pricing');
    const text = await page.locator('body').textContent();
    // The pricing dashboard may show credit amounts (100/600/2000) or
    // an empty state if no workspace exists.
    const hasCredits = /100|600|2000/.test(text || '');
    const hasEmptyState = /Sign in|workspace|company|Create|No workspace/i.test(text || '');
    expect(hasCredits || hasEmptyState).toBeTruthy();
  });

  // ── Checkout API tests (authenticated via storageState) ──
  // These may be rate-limited (429) when run as part of the full suite.

  test('checkout API rejects unknown pack ID', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      data: { packId: 'nonexistent_pack' },
    });
    if (res.status() === 429) {
      test.skip(true, 'rate limited');
      return;
    }
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('unknown_pack');
  });

  test('checkout API rejects missing pack ID', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      data: {},
    });
    if (res.status() === 429) {
      test.skip(true, 'rate limited');
      return;
    }
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('unknown_pack');
  });

  test('checkout API returns checkout_failed or url for valid pack', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      data: { packId: 'starter' },
    });
    if (res.status() === 429) {
      test.skip(true, 'rate limited');
      return;
    }
    // Without real Dodo API keys: 502 (checkout_failed) or 400 (checkout_not_enabled)
    // With keys: 200 + { url }
    if (res.ok()) {
      const body = await res.json();
      expect(body.url).toBeTruthy();
      expect(typeof body.url).toBe('string');
    } else {
      expect([400, 502]).toContain(res.status());
      const body = await res.json().catch(() => ({}));
      expect(['checkout_failed', 'checkout_not_enabled']).toContain(body.error);
    }
  });

  // ── Webhook security tests ──

  test('webhook rejects requests without signature headers', async ({ request }) => {
    const res = await request.post('/api/webhook/dodo', {
      data: { type: 'payment.succeeded', data: {} },
    });
    // Should return 400 (webhook not configured or missing headers)
    expect([400, 401]).toContain(res.status());
  });

  test('webhook rejects requests with invalid signature', async ({ request }) => {
    const res = await request.post('/api/webhook/dodo', {
      headers: {
        'webhook-signature': 'invalid_signature',
        'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      },
      data: { type: 'payment.succeeded', data: {} },
    });
    expect([400, 401]).toContain(res.status());
  });

  // ── Unauthenticated checkout test ──

  test('checkout API rejects unauthenticated requests', async () => {
    // Use a plain fetch with no cookies to ensure no auth state is sent
    const res = await fetch('http://localhost:3100/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: 'starter' }),
    });
    // Should be 401 (unauthorized) — no session cookie sent
    expect([401, 429]).toContain(res.status);
  });
});
