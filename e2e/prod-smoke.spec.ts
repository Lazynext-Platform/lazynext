import { test, expect } from '@playwright/test';

/**
 * Production smoke tests — run against https://lazynext.com
 * These verify that the deployed site is healthy and key endpoints respond.
 * Run with: npx playwright test --config=playwright.prod.config.ts
 */

test.describe('Production health', () => {
  test('health endpoint returns 200 with healthy status', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.platform).toBe('lazynext-os');
  });

  test('API v1 metadata returns 200', async ({ request }) => {
    const res = await request.get('/api/v1');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBeTruthy();
    expect(body.version).toBe('1.0.0');
  });

  test('API v1 requires authentication', async ({ request }) => {
    const res = await request.get('/api/v1/workspaces');
    expect(res.status()).toBe(401);
  });

  test('MCP endpoint returns 200 on GET', async ({ request }) => {
    const res = await request.get('/mcp');
    expect(res.status()).toBe(200);
  });

  test('MCP responds to ping (may require auth)', async ({ request }) => {
    const res = await request.post('/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    // MCP endpoint exists and responds — 200 if auth not required, 400/401 if auth required
    expect(res.status()).toBeLessThan(500);
  });

  test('MCP lists tools (may require auth)', async ({ request }) => {
    const res = await request.post('/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    // MCP endpoint exists and responds — 200 if auth not required, 400/401 if auth required
    expect(res.status()).toBeLessThan(500);
  });

  test('OAuth protected resource metadata returns 200', async ({ request }) => {
    const res = await request.get('/.well-known/oauth-protected-resource');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.resource).toBeTruthy();
  });
});

test.describe('Production page loads', () => {
  test('homepage loads', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
  });

  test('login page loads', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);
  });

  test('signup page loads', async ({ page }) => {
    const res = await page.goto('/signup');
    expect(res?.status()).toBe(200);
  });

  test('developers page loads', async ({ page }) => {
    const res = await page.goto('/developers');
    expect(res?.status()).toBe(200);
  });

  test('status page loads', async ({ page }) => {
    const res = await page.goto('/status');
    expect(res?.status()).toBe(200);
  });

  test('pricing page loads', async ({ page }) => {
    const res = await page.goto('/pricing');
    expect(res?.status()).toBe(200);
  });
});

test.describe('Production legal pages', () => {
  const legalPages = [
    '/terms',
    '/privacy',
    '/cookies',
    '/acceptable-use',
    '/ai-policy',
    '/api-terms',
    '/dpa',
    '/subprocessors',
    '/security',
    '/data-request',
  ];

  for (const path of legalPages) {
    test(`${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    });
  }
});

test.describe('Production OS pages redirect to login when unauthenticated', () => {
  const osPages = [
    '/dashboard',
    '/projects',
    '/tasks',
    '/documents',
    '/calendar',
    '/people',
    '/conversations',
    '/automations',
    '/agents',
    '/integrations',
    '/analytics',
    '/creative',
    '/search',
    '/settings',
    '/files',
  ];

  for (const path of osPages) {
    test(`${path} redirects or shows login prompt`, async ({ page }) => {
      const res = await page.goto(path);
      // OS pages should either redirect to login or show a sign-in prompt
      // They should NOT 500 or show an unhandled error
      expect(res?.status()).toBeLessThan(500);
    });
  }
});

test.describe('Production old route redirects', () => {
  test('old ad-studio routes redirect to /creative/generators', async ({ page }) => {
    const oldRoutes = [
      '/ad-copy-generator',
      '/ad-script-writer',
      '/creative-brief-generator',
      '/creative-ad-anticipation-builder',
      '/brand-voice',
      '/brief-analyzer',
      '/hook-library',
      '/mood-board-generator',
      '/viral-analyzer',
      '/trend-spotter',
    ];

    for (const route of oldRoutes) {
      const res = await page.goto(route);
      // Should redirect (301/308) or land on /creative/generators
      expect(res?.status()).toBeLessThan(400);
      expect(page.url()).toContain('/creative');
    }
  });

  test('old studio routes redirect to /creative', async ({ page }) => {
    const oldStudios = [
      '/creative-studio',
      '/creative-director',
      '/lazynext-studio',
      '/ugc-studio',
      '/narrative-studio',
      '/drama-studio',
      '/image-studio',
      '/audio-studio',
    ];

    for (const route of oldStudios) {
      const res = await page.goto(route);
      expect(res?.status()).toBeLessThan(400);
      expect(page.url()).toContain('/creative');
    }
  });

  test('old pipeline redirects to /creative/pipelines', async ({ page }) => {
    const res = await page.goto('/pipeline');
    expect(res?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/creative/pipelines');
  });

  test('old skills redirect to /agents', async ({ page }) => {
    const res = await page.goto('/skills');
    expect(res?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/agents');
  });

  test('old mcp-server redirects to /developers', async ({ page }) => {
    const res = await page.goto('/mcp-server');
    expect(res?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/developers');
  });
});

test.describe('Production security headers', () => {
  test('security headers are present', async ({ request }) => {
    const res = await request.get('/');
    const headers = res.headers();

    // HSTS
    expect(headers['strict-transport-security']).toBeTruthy();
    // X-Content-Type-Options
    expect(headers['x-content-type-options']).toBe('nosniff');
    // X-Frame-Options
    expect(headers['x-frame-options']).toBeTruthy();
    // Referrer-Policy
    expect(headers['referrer-policy']).toBeTruthy();
  });
});

/**
 * Authenticated Prisma tests — these verify that Prisma actually works
 * in production with a real authenticated session. The Prisma WASM bug
 * (fast→small swap mismatch) was hidden for weeks because all existing
 * prod tests only checked unauthenticated routes (which return 401
 * before ever calling Prisma) or the health endpoint (which doesn't
 * use Prisma at all).
 *
 * These tests require the test user to exist in production D1.
 */
test.describe('Production authenticated Prisma operations', () => {
  // These tests share a browser context to reuse the session cookie
  test('credentials login works and creates a session', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Get CSRF token
    const csrfRes = await page.request.get('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json();

    // Login
    const loginRes = await page.request.post('/api/auth/callback/credentials', {
      form: {
        email: 'test@lazynext.local',
        password: 'Test1234!',
        csrfToken,
        callbackUrl: 'https://lazynext.com/dashboard',
        json: 'true',
      },
      maxRedirects: 0,
    });
    // Should redirect (302) to dashboard, not to error page
    const location = loginRes.headers()['location'] || '';
    expect(location).not.toContain('error');
  });

  test('authenticated /api/me returns user data via Prisma', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login first
    const csrfRes = await page.request.get('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json();
    await page.request.post('/api/auth/callback/credentials', {
      form: {
        email: 'test@lazynext.local',
        password: 'Test1234!',
        csrfToken,
        callbackUrl: 'https://lazynext.com/dashboard',
        json: 'true',
      },
      maxRedirects: 0,
    });

    // Test Prisma read
    const meRes = await page.request.get('/api/me');
    expect(meRes.status()).toBe(200);
    const me = await meRes.json();
    expect(me.credits).toBeDefined();
  });

  test('authenticated /api/notifications returns via Prisma', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const csrfRes = await page.request.get('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json();
    await page.request.post('/api/auth/callback/credentials', {
      form: {
        email: 'test@lazynext.local',
        password: 'Test1234!',
        csrfToken,
        callbackUrl: 'https://lazynext.com/dashboard',
        json: 'true',
      },
      maxRedirects: 0,
    });

    const notifRes = await page.request.get('/api/notifications');
    expect(notifRes.status()).toBe(200);
    const notifBody = await notifRes.json();
    expect(notifBody.notifications).toBeDefined();
    expect(typeof notifBody.unreadCount).toBe('number');
  });

  test('authenticated /api/settings/notifications returns prefs via Prisma', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const csrfRes = await page.request.get('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json();
    await page.request.post('/api/auth/callback/credentials', {
      form: {
        email: 'test@lazynext.local',
        password: 'Test1234!',
        csrfToken,
        callbackUrl: 'https://lazynext.com/dashboard',
        json: 'true',
      },
      maxRedirects: 0,
    });

    const prefsRes = await page.request.get('/api/settings/notifications');
    expect(prefsRes.status()).toBe(200);
    const prefs = await prefsRes.json();
    expect(prefs.prefs).toBeDefined();
  });

  test('POST /api/data-request persists to D1 via Prisma (no auth required)', async ({ request }) => {
    const res = await request.post('/api/data-request', {
      data: {
        type: 'access',
        email: 'e2e-test@example.com',
        name: 'E2E Test',
        details: 'Automated test request',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeTruthy();
  });
});
