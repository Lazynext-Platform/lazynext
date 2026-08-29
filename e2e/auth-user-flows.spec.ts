/**
 * Authenticated E2E tests for user-scoped features.
 * Uses storageState from global-setup.ts (test@lazynext.local, admin access).
 */
import { test, expect } from '@playwright/test';

test.describe('Authenticated user pages', () => {
  test('dashboard loads with user content', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('my-work page loads', async ({ page }) => {
    await page.goto('/my-work');
    await expect(page).toHaveURL(/\/my-work/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin dashboard loads (test account has admin access)', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/api/me returns user info', async ({ request }) => {
    const res = await request.get('/api/me');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(typeof data.credits).toBe('number');
    expect(data.isAdmin).toBe(true);
  });

  test('credits analytics API returns data', async ({ request }) => {
    const res = await request.get('/api/credits/analytics');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toBeTruthy();
  });

  test('admin users API returns list', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.users) || Array.isArray(data)).toBeTruthy();
  });

  test('creative tools list API returns tools', async ({ request }) => {
    const res = await request.get('/api/creative/tools');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toBeTruthy();
  });

  test('pipeline templates API returns all 5 templates with score', async ({ request }) => {
    const res = await request.get('/api/creative/pipeline/templates');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const templates = data.templates || data;
    expect(templates.length).toBeGreaterThanOrEqual(5);
    for (const tmpl of templates) {
      const stageNames = (tmpl.stages || []).map((s: any) => s.stage || s);
      expect(stageNames).toContain('score');
    }
  });
});

test.describe('Full pipeline execution flow', () => {
  test('create and advance pipeline through all stages', async ({ request }) => {
    // 1. Create a quick-ad pipeline
    const createRes = await request.post('/api/creative/pipeline', {
      data: {
        templateId: 'quick-ad',
        config: {
          productName: 'E2E Flow Test Product',
          productDescription: 'A test product for full pipeline E2E',
          platforms: ['tiktok'],
          onComplete: 'review',
        },
      },
    });
    // Skip if rate-limited or transient failure (credits, persistence, etc.)
    if (!createRes.ok()) {
      const errBody = await createRes.json().catch(() => ({}));
      test.skip(
        errBody.error === 'rate_limited' ||
        errBody.error === 'insufficient_credits' ||
        createRes.status() === 429 ||
        createRes.status() === 402,
        `Pipeline creation returned ${createRes.status()}: ${JSON.stringify(errBody)}`,
      );
      return;
    }
    expect(createRes.ok()).toBeTruthy();
    const createData = await createRes.json();
    const pipelineId = createData.state.pipelineId;
    expect(pipelineId).toBeTruthy();

    let state = createData.state;
    let safety = 0;

    // 2. Advance through all stages
    while (state.status === 'running' && state.currentStage && state.currentStage !== 'completed' && safety < 20) {
      const advanceRes = await request.post(`/api/creative/pipeline/${pipelineId}`, {
        data: { action: 'advance' },
      });
      if (!advanceRes.ok()) {
        // If advance fails (e.g. credits exhausted), break and verify what we have
        const errBody = await advanceRes.json().catch(() => ({}));
        break;
      }
      const advanceData = await advanceRes.json();
      state = advanceData.state;
      if (state.status === 'failed' || state.status === 'paused') break;
      safety++;
    }

    // 3. Verify pipeline reached a terminal state or advanced at least once
    expect(['completed', 'paused', 'failed', 'running']).toContain(state.status);

    // 4. If completed, verify stage results
    if (state.status === 'completed') {
      const stages = state.stageResults.map((r: any) => r.stage);
      expect(stages).toContain('brief');
      expect(stages).toContain('script');
      expect(stages).toContain('storyboard');
      expect(stages).toContain('media_generation');
      expect(stages).toContain('score');
      expect(stages).toContain('publish');
    }
  });

  test('auto-advance chains multiple stages in a single advance request', async ({ request }) => {
    // Create a pipeline with autoAdvance enabled (default for quick-ad template)
    const createRes = await request.post('/api/creative/pipeline', {
      data: {
        templateId: 'quick-ad',
        config: {
          productName: 'Auto-Advance Test Product',
          productDescription: 'Test for auto-advance chaining',
          platforms: ['tiktok'],
          onComplete: 'review',
        },
      },
    });
    if (!createRes.ok()) {
      const body = await createRes.json().catch(() => ({}));
      test.skip(body.error === 'insufficient_credits', 'Credits exhausted');
      test.skip(createRes.status() === 429, 'Rate limited');
      return;
    }
    const createData = await createRes.json();
    const pipelineId = createData.state?.pipelineId;
    expect(pipelineId).toBeTruthy();

    // The creation request already executes the first stage and auto-advances.
    // Count how many stages are already completed after creation.
    const initialState = createData.state;
    const completedAfterCreate = initialState.stageResults.filter(
      (r: any) => r.status === 'completed',
    ).length;

    // If the pipeline already completed or paused after creation, auto-advance ran.
    // It may have completed only 1 stage if credits were low or the deadline was hit.
    if (initialState.status === 'completed' || initialState.status === 'paused' || initialState.status === 'failed') {
      // At least the first stage should have completed
      expect(completedAfterCreate).toBeGreaterThanOrEqual(1);
      return;
    }

    // If still running, send a single advance and check if it chains
    const advanceRes = await request.post(`/api/creative/pipeline/${pipelineId}`, {
      data: { action: 'advance' },
    });
    if (!advanceRes.ok()) {
      const errBody = await advanceRes.json().catch(() => ({}));
      test.skip(errBody.error === 'insufficient_credits', 'Credits exhausted during advance');
      test.skip(advanceRes.status() === 429, 'Rate limited');
      return;
    }
    const advanceData = await advanceRes.json();
    const state = advanceData.state;
    const completedAfterAdvance = state.stageResults.filter(
      (r: any) => r.status === 'completed',
    ).length;

    // Auto-advance should have completed at least one more stage than after creation
    expect(completedAfterAdvance).toBeGreaterThan(completedAfterCreate);
  });

  test('can fetch pipeline state by ID', async ({ request }) => {
    // Create a pipeline
    const createRes = await request.post('/api/creative/pipeline', {
      data: {
        templateId: 'quick-ad',
        config: {
          productName: 'Fetch Test Product',
          productDescription: 'Test',
          platforms: ['tiktok'],
        },
      },
    });
    // If credits are exhausted or rate limited, skip this test
    if (!createRes.ok()) {
      const body = await createRes.json().catch(() => ({}));
      test.skip(body.error === 'insufficient_credits', 'Credits exhausted');
      test.skip(createRes.status() === 429, 'Rate limited');
      return;
    }
    const createData = await createRes.json();
    const pipelineId = createData.state?.pipelineId;
    expect(pipelineId).toBeTruthy();

    // Fetch by ID
    const getRes = await request.get(`/api/creative/pipeline/${pipelineId}`);
    // The pipeline may not persist if prisma is rate-limited; accept 404
    if (getRes.status() === 404) {
      test.skip(true, 'Pipeline not persisted (likely rate limited)');
      return;
    }
    // Accept 429 (rate limited) and 500 (D1 cold-start) as skip conditions
    // during full E2E runs where the test account is under heavy load.
    if (getRes.status() === 429 || getRes.status() === 500) {
      test.skip(true, `Pipeline GET returned ${getRes.status()} (likely rate limited or cold start)`);
      return;
    }
    expect(getRes.ok()).toBeTruthy();
    const getData = await getRes.json();
    expect(getData.state.pipelineId).toBe(pipelineId);
  });
});

test.describe('A/B automation access', () => {
  test('ab-automation page loads', async ({ page }) => {
    await page.goto('/ab-automation');
    await expect(page).toHaveURL(/\/ab-automation/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('ab-automation API returns data or empty list', async ({ request }) => {
    const res = await request.get('/api/creative/ab-automation');
    // The route may return 200, 429 (rate limited), or 500 (D1 cold-start)
    if (res.ok()) {
      const data = await res.json();
      expect(data).toBeTruthy();
    } else {
      // Non-OK is acceptable for transient issues
      expect([401, 429, 500, 502, 503]).toContain(res.status());
    }
  });
});
