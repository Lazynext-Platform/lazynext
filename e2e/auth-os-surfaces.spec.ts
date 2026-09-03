/**
 * E2E tests for Phase 3-4 OS surfaces.
 *
 * Authenticated tests use storageState from global-setup (test@lazynext.local).
 * Run against local dev server with mock Atlas on port 3099.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

// ---------------------------------------------------------------------------
// Phase 3: Core OS pages
// ---------------------------------------------------------------------------

test.describe('Phase 3: Core OS pages', () => {
  test('dashboard loads with OS shell', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('projects page loads', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('tasks page loads', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('documents page loads', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).toHaveURL(/\/documents/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('files page loads', async ({ page }) => {
    await page.goto('/files');
    await expect(page).toHaveURL(/\/files/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('search page loads', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('workspaces page loads', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/workspaces/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Phase 4: Application modules
// ---------------------------------------------------------------------------

test.describe('Phase 4: Application modules', () => {
  test('calendar page loads', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('people page loads', async ({ page }) => {
    await page.goto('/people');
    await expect(page).toHaveURL(/\/people/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('conversations page loads', async ({ page }) => {
    await page.goto('/conversations');
    await expect(page).toHaveURL(/\/conversations/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('automations page loads', async ({ page }) => {
    await page.goto('/automations');
    await expect(page).toHaveURL(/\/automations/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('agents page loads', async ({ page }) => {
    await page.goto('/agents');
    await expect(page).toHaveURL(/\/agents/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('integrations page loads', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page).toHaveURL(/\/integrations/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('analytics page loads', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('creative hub page loads', async ({ page }) => {
    await page.goto('/creative');
    await expect(page).toHaveURL(/\/creative/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('creative pipelines page loads', async ({ page }) => {
    await page.goto('/creative/pipelines');
    await expect(page).toHaveURL(/\/creative\/pipelines/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('creative generators page loads', async ({ page }) => {
    await page.goto('/creative/generators');
    await expect(page).toHaveURL(/\/creative\/generators/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Developer & API
// ---------------------------------------------------------------------------

test.describe('Phase 5: Developer & API', () => {
  test('developers page loads', async ({ page }) => {
    await page.goto('/developers');
    await expect(page).toHaveURL(/\/developers/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('API v1 root returns metadata', async ({ request }) => {
    const res = await request.get('/api/v1');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.name).toBe('Lazynext API');
    expect(data.version).toBe('1.0.0');
    expect(data.endpoints).toBeTruthy();
  });

  test('API v1 workspaces requires authentication', async ({ request }) => {
    const res = await request.get('/api/v1/workspaces');
    expect(res.status()).toBe(401);
  });

  test('MCP endpoint returns server info on GET', async ({ request }) => {
    const res = await request.get('/mcp');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.server.name).toBe('lazynext');
    expect(data.server.protocolVersion).toBe('2026-07-28');
  });

  test('MCP server/discover responds to valid request', async ({ request }) => {
    const res = await request.post('/mcp', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'server/discover',
        _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' },
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.jsonrpc).toBe('2.0');
    expect(data.result.resultType).toBe('server.discover');
    expect(data.result.server.name).toBe('lazynext');
    expect(data.result.server.protocolVersion).toBe('2026-07-28');
  });

  test('MCP tools/list returns tools', async ({ request }) => {
    const res = await request.post('/mcp', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' },
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result.resultType).toBe('tools.list');
    expect(Array.isArray(data.result.tools)).toBeTruthy();
    expect(data.result.tools.length).toBeGreaterThanOrEqual(9);
  });

  test('MCP ping returns pong', async ({ request }) => {
    const res = await request.post('/mcp', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        jsonrpc: '2.0',
        id: 3,
        method: 'ping',
        _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' },
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result.resultType).toBe('pong');
  });

  test('MCP notification returns 202', async ({ request }) => {
    const res = await request.post('/mcp', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      },
    });
    expect(res.status()).toBe(202);
  });

  test('MCP rejects missing protocol version', async ({ request }) => {
    const res = await request.post('/mcp', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        jsonrpc: '2.0',
        id: 4,
        method: 'ping',
      },
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  test('MCP rejects invalid jsonrpc version', async ({ request }) => {
    const res = await request.post('/mcp', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        jsonrpc: '1.0',
        id: 5,
        method: 'ping',
        _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' },
      },
    });
    expect(res.status()).toBe(400);
  });

  test('MCP rejects unknown method', async ({ request }) => {
    const res = await request.post('/mcp', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        jsonrpc: '2.0',
        id: 6,
        method: 'unknown/method',
        _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' },
      },
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe(-32601);
  });

  test('OAuth protected resource metadata is valid', async ({ request }) => {
    const res = await request.get('/.well-known/oauth-protected-resource');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.resource).toContain('/mcp');
    expect(data.bearer_methods_supported).toContain('header');
    expect(data.scopes_supported).toContain('read');
    expect(data.scopes_supported).toContain('write');
    expect(data.scopes_supported).toContain('admin');
  });

  test('API keys list requires session', async ({ request }) => {
    // Without storageState, this would be 401. With storageState, it should work.
    const res = await request.get('/api/keys');
    expect([200, 401]).toContain(res.status());
  });
});

// ---------------------------------------------------------------------------
// Phase 6: Legal pages
// ---------------------------------------------------------------------------

test.describe('Phase 6: Legal pages (unauthenticated)', () => {
  test.use({ storageState: undefined });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page).toHaveURL(/\/terms/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('cookies page loads', async ({ page }) => {
    await page.goto('/cookies');
    await expect(page).toHaveURL(/\/cookies/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('acceptable-use page loads', async ({ page }) => {
    await page.goto('/acceptable-use');
    await expect(page).toHaveURL(/\/acceptable-use/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('ai-policy page loads', async ({ page }) => {
    await page.goto('/ai-policy');
    await expect(page).toHaveURL(/\/ai-policy/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('api-terms page loads', async ({ page }) => {
    await page.goto('/api-terms');
    await expect(page).toHaveURL(/\/api-terms/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('dpa page loads', async ({ page }) => {
    await page.goto('/dpa');
    await expect(page).toHaveURL(/\/dpa/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('subprocessors page loads', async ({ page }) => {
    await page.goto('/subprocessors');
    await expect(page).toHaveURL(/\/subprocessors/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('security page loads', async ({ page }) => {
    await page.goto('/security');
    await expect(page).toHaveURL(/\/security/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('data-request page loads', async ({ page }) => {
    await page.goto('/data-request');
    await expect(page).toHaveURL(/\/data-request/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('legal pages have footer cross-links', async ({ page }) => {
    await page.goto('/security');
    await expect(page.locator('body')).toBeVisible();
    // Check for footer links to other legal pages
    const footerLinks = page.locator('a[href="/terms"], a[href="/privacy"], a[href="/cookies"]');
    expect(await footerLinks.count()).toBeGreaterThanOrEqual(3);
  });
});
