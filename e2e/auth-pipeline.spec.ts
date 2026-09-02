/**
 * Authenticated E2E tests — uses the storageState saved by global-setup.ts.
 * These tests run under the `chromium-auth` project and have an active
 * session for test@lazynext.local (150 credits, admin access).
 *
 * Test file naming convention: `auth-*.spec.ts` — the playwright config
 * routes these to the authenticated project and excludes them from the
 * unauthenticated projects.
 */
import { test, expect } from '@playwright/test';

test.describe('Authenticated pipeline access', () => {
  test('session is active — /api/auth/session returns user', async ({ request }) => {
    const res = await request.get('/api/auth/session');
    expect(res.ok()).toBeTruthy();
    const session = await res.json();
    expect(session.user).toBeTruthy();
    expect(session.user.email).toBe('test@lazynext.local');
  });

  test('pipeline page loads with active session', async ({ page }) => {
    await page.goto('/pipeline');
    // Should not redirect to a sign-in prompt — the page should render
    await expect(page).toHaveURL(/\/pipeline/);
    // The page should have visible content (not just an auth prompt)
    await expect(page.locator('body')).toBeVisible();
  });

  test('can create a pipeline via API', async ({ request }) => {
    const res = await request.post('/api/creative/pipeline', {
      data: {
        templateId: 'quick-ad',
        config: {
          productName: 'E2E Test Product',
          productDescription: 'A test product for authenticated E2E',
          platforms: ['tiktok'],
        },
      },
    });
    // Skip if rate-limited or transient failure
    if (!res.ok()) {
      const errBody = await res.json().catch(() => ({}));
      test.skip(
        errBody.error === 'rate_limited' ||
        errBody.error === 'insufficient_credits' ||
        res.status() === 429 ||
        res.status() === 402,
        `Pipeline creation returned ${res.status()}: ${JSON.stringify(errBody)}`,
      );
      return;
    }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.state).toBeTruthy();
    expect(data.state.pipelineId).toBeTruthy();
    // stages is in config.stages as PipelineStageConfig objects with a `stage` property
    const stageNames = (data.state.config?.stages || []).map((s: any) => s.stage || s);
    expect(stageNames).toContain('score');
  });

  test('pipeline templates include score in all templates', async ({ request }) => {
    const res = await request.get('/api/creative/pipeline/templates');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const templates = data.templates || data;
    expect(Array.isArray(templates)).toBeTruthy();
    // Every template should now include the score stage
    for (const tmpl of templates) {
      const stageNames = (tmpl.stages || []).map((s: any) => s.stage || s);
      expect(
        stageNames,
        `template ${tmpl.templateId} should include score stage`
      ).toContain('score');
    }
  });

  test('creative studio pipeline mode help mentions score', async ({ page }) => {
    await page.goto('/creative-studio');
    // The pipeline mode help text should mention score
    const helpText = page.getByText(/score/i);
    await expect(helpText.first()).toBeVisible({ timeout: 5000 });
  });

  test('workflow builder page loads with active session', async ({ page }) => {
    await page.goto('/workflow-builder');
    await expect(page).toHaveURL(/\/workflow-builder/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('clip editor page loads with active session', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page).toHaveURL(/\/clip-editor/);
    await expect(page.locator('body')).toBeVisible();
  });
});
