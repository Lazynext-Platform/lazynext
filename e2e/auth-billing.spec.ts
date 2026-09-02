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

  test('pricing page renders all 3 credit packs', async ({ page }) => {
    await page.goto('/pricing');
    const h2s = page.locator('h2');
    await expect(h2s).toHaveCount(3);
  });

  test('pricing page shows pack names', async ({ page }) => {
    await page.goto('/pricing');
    const text = await page.locator('body').textContent();
    expect(text).toMatch(/Starter|Pro|Elite/i);
  });

  test('pricing page has currency selector', async ({ page }) => {
    await page.goto('/pricing');
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
    let found = false;
    for (let i = 0; i < count; i++) {
      const options = await selects.nth(i).locator('option').allTextContents();
      if (options.some((o) => o.includes('USD'))) { found = true; break; }
    }
    expect(found).toBeTruthy();
  });

  test('pricing page no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pricing');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('pricing page shows credit amounts', async ({ page }) => {
    await page.goto('/pricing');
    const text = await page.locator('body').textContent();
    expect(text).toMatch(/100/);
    expect(text).toMatch(/600/);
    expect(text).toMatch(/2000/);
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
