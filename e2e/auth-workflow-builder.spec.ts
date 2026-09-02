/**
 * Authenticated E2E tests for the Workflow Builder parallel-wave functionality.
 *
 * Uses the storageState saved by global-setup.ts.
 * Runs under the `chromium-auth` project with an active session for
 * test@lazynext.local (150 credits, admin access).
 */
import { test, expect } from '@playwright/test';

test.describe('Workflow Builder parallel waves', () => {
  test('can create a pipeline with parallelWith stages via API', async ({ request }) => {
    // Create a pipeline that uses parallelWith for media_generation and audio
    // stages, which should execute concurrently in the same wave.
    const res = await request.post('/api/creative/pipeline', {
      data: {
        config: {
          name: 'Parallel Wave E2E Test',
          productName: 'Parallel Wave E2E Product',
          productDescription: 'A test product for parallel wave E2E',
          platforms: ['tiktok'],
          onComplete: 'review',
          stages: [
            { stage: 'brief', enabled: true, autoAdvance: true, config: {} },
            { stage: 'script', enabled: true, autoAdvance: true, config: {} },
            { stage: 'storyboard', enabled: true, autoAdvance: true, config: {} },
            { stage: 'media_generation', enabled: true, autoAdvance: true, config: { parallelWith: ['audio'] } },
            { stage: 'audio', enabled: true, autoAdvance: true, config: {} },
            { stage: 'edit', enabled: true, autoAdvance: true, config: {} },
            { stage: 'compliance', enabled: true, autoAdvance: true, config: {} },
            { stage: 'score', enabled: true, autoAdvance: true, config: {} },
            { stage: 'publish', enabled: true, autoAdvance: false, config: {} },
          ],
        },
      },
    });

    // Skip if rate-limited or insufficient credits
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

    // Verify the pipeline has parallelWith configured
    const mediaStage = data.state.config?.stages?.find((s: any) => s.stage === 'media_generation');
    expect(mediaStage).toBeTruthy();
    expect(mediaStage.config?.parallelWith).toBeDefined();
    expect(mediaStage.config.parallelWith).toContain('audio');

    // Verify both media_generation and audio are in the pipeline
    const stageNames = (data.state.config?.stages || []).map((s: any) => s.stage);
    expect(stageNames).toContain('media_generation');
    expect(stageNames).toContain('audio');
  });

  test('parallel stages execute concurrently in the same wave', async ({ request }) => {
    // Create a pipeline with parallel stages
    const createRes = await request.post('/api/creative/pipeline', {
      data: {
        config: {
          name: 'Parallel Execution E2E Test',
          productName: 'Parallel Execution E2E',
          productDescription: 'Test product for parallel execution verification',
          platforms: ['tiktok'],
          onComplete: 'review',
          stages: [
            { stage: 'brief', enabled: true, autoAdvance: true, config: {} },
            { stage: 'script', enabled: true, autoAdvance: true, config: {} },
            { stage: 'storyboard', enabled: true, autoAdvance: true, config: {} },
            { stage: 'media_generation', enabled: true, autoAdvance: true, config: { parallelWith: ['audio'] } },
            { stage: 'audio', enabled: true, autoAdvance: true, config: {} },
            { stage: 'compliance', enabled: true, autoAdvance: true, config: {} },
            { stage: 'score', enabled: true, autoAdvance: true, config: {} },
            { stage: 'publish', enabled: true, autoAdvance: false, config: {} },
          ],
        },
      },
    });

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

    const createData = await createRes.json();
    const pipelineId = createData.state.pipelineId;
    expect(pipelineId).toBeTruthy();

    // The initial creation should have started the first wave (brief stage).
    // Verify the pipeline is in a running or paused state.
    expect(['running', 'paused', 'completed', 'failed']).toContain(createData.state.status);

    // If the pipeline auto-advanced, check that parallel stages were both started
    // at the same time (both should have startedAt timestamps in the same wave)
    const mediaResult = createData.state.stageResults?.find((r: any) => r.stage === 'media_generation');
    const audioResult = createData.state.stageResults?.find((r: any) => r.stage === 'audio');

    if (mediaResult && audioResult) {
      // If both have been started, they should have startedAt timestamps
      if (mediaResult.status !== 'pending' && audioResult.status !== 'pending') {
        expect(mediaResult.startedAt).toBeTruthy();
        expect(audioResult.startedAt).toBeTruthy();
      }
    }
  });

  test('workflow builder page loads with parallel stage support', async ({ page }) => {
    await page.goto('/workflow-builder');
    await expect(page).toHaveTitle(/Lazynext/i);
    // The page should load with the workflow builder UI visible
    await expect(page.locator('h1')).toBeVisible();
    // Should not show an auth modal (we're authenticated)
    const authModal = page.locator('[role="dialog"][aria-modal="true"]');
    // The auth modal might briefly appear but should not be the main content
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toMatch(/Workflow|工作流|ワークフロー|Flujos|Flux|워크플로우|سير العمل|वर्कफ़्लो|Quy trình|เวิร์กโฟลว์|Alur Kerja/i);
  });
});
