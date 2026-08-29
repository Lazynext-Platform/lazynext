import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';
import {
  createPipeline,
  validatePipelineConfig,
  advancePipeline,
  advancePipelineWithWaves,
  configFromWorkflow,
  failStage,
  completeStage,
  PIPELINE_COSTS,
  type PipelineConfig,
  type PipelineState,
  type PipelineStage,
} from '@/lib/creative/pipeline';
import { executeStage, initialContext, mergeStageResultIntoContext, type StageContext, PipelineStageError } from '@/lib/creative/pipeline-executor';
import { startWorkflow, recordStep, completeWorkflow, failWorkflow } from '@/lib/workflow/engine';
import { logToolExecution } from '@/lib/telemetry';

export const maxDuration = 90;

/**
 * GET /api/creative/pipeline
 * List the current user's pipelines (stored as WorkflowRun rows of type 'creative-pipeline').
 */
async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);

  const runs = await prisma.workflowRun.findMany({
    where: { userId: uid, workflowType: 'creative-pipeline' },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });

  const pipelines: PipelineState[] = runs
    .map((r) => {
      try {
        const state = typeof r.output === 'string' ? JSON.parse(r.output) : r.output;
        return state as PipelineState;
      } catch {
        return null;
      }
    })
    .filter((s): s is PipelineState => !!s && typeof s === 'object' && 'pipelineId' in s);

  return NextResponse.json({ pipelines });
}

/**
 * POST /api/creative/pipeline
 * Body: PipelineConfig (optionally { templateId } to build from a template).
 * Validates config, creates pipeline state, deducts credits for the first stage,
 * and starts the pipeline (advances to the first stage).
 *
 * Returns { state: PipelineState }.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  // Rate limit: 10 pipeline creations per minute per IP
  const ip = getClientIP(req);
  const rl = checkAuthRateLimit(ip, 'pipeline-create', 10, 60_000);
  if (rl.limited) {
    return NextResponse.json({ error: 'rate_limited', retryAfter: rl.retryAfter }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } });
  }

  await getUserPlanTier(uid); // plan-tier aware (no gating here, but recorded for routing)

  const body = await req.json().catch(() => ({}));

  // Accept either a full PipelineConfig, { templateId, overrides }, or { workflow, context }.
  let config: PipelineConfig;
  let useWaves = false;

  if (body.workflow && typeof body.workflow === 'object' && Array.isArray(body.workflow.stages)) {
    // Workflow Builder v2: build config from workflow definition + execution context
    const ctx = body.context || {};
    const built = configFromWorkflow(body.workflow, ctx, body.config || {});
    if (!built) return NextResponse.json({ error: 'invalid_workflow' }, { status: 400 });
    config = built;
    useWaves = true; // Use wave-based advancement for parallel execution
  } else if (body.templateId && typeof body.templateId === 'string') {
    const { configFromTemplate } = await import('@/lib/creative/pipeline');
    const built = configFromTemplate(body.templateId, body.config || body.overrides || {});
    if (!built) return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    config = built;
  } else {
    config = body.config || body;
  }

  // Basic shape coercion for safety.
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'config_required' }, { status: 400 });
  }
  if (Array.isArray(config.stages)) {
    config.stages = config.stages.map((s: any) => ({
      stage: String(s.stage) as PipelineStage,
      enabled: s.enabled !== false,
      autoAdvance: s.autoAdvance !== false,
      config: (s.config && typeof s.config === 'object' ? s.config : {}) as Record<string, unknown>,
    }));
  }

  const validation = validatePipelineConfig(config);
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_config', errors: validation.errors }, { status: 400 });
  }

  // Create the pipeline state (draft).
  let state = createPipeline(config);

  // Start the pipeline: advance from draft to the first in_progress stage.
  // Use wave-based advancement if the pipeline was built from a workflow definition.
  // Credits for the first wave are deducted below in the in_progress loop,
  // which handles both single-stage and parallel-wave first waves.
  state = useWaves ? advancePipelineWithWaves(state) : advancePipeline(state);

  // Persist as a WorkflowRun row.
  try {
    await prisma.workflowRun.create({
      data: {
        id: state.pipelineId,
        userId: uid,
        workflowType: 'creative-pipeline',
        status: state.status,
        input: JSON.parse(JSON.stringify(config)),
        output: JSON.parse(JSON.stringify(state)),
      },
    });
  } catch (e) {
    logToolExecution({
      tool: 'pipeline_create_persist',
      userId: uid,
      cost: 0,
      durationMs: 0,
      success: false,
      error: String(e),
    });
    // Non-fatal: return the in-memory state so the client can still drive it.
  }

  // Record workflow start via the engine (for Analytics Hub per-step tracking).
  await startWorkflow(uid, 'creative-pipeline', { pipelineId: state.pipelineId, config: JSON.parse(JSON.stringify(config)) }).catch(() => {});

  // Execute the first stage(s) if any are now in_progress.
  if (state.currentStage && state.currentStage !== 'completed' && state.status === 'running') {
    // Find all in_progress stages in the current wave (parallel partners)
    const inProgressStages = state.stageResults
      .filter((r) => r.status === 'in_progress')
      .map((r) => r.stage);

    // Deduct credits for all in_progress stages (idempotent via charged flag)
    for (const stageName of inProgressStages) {
      const stageCost = PIPELINE_COSTS[stageName] ?? 0;
      const stageIdx = state.stageResults.findIndex((r) => r.stage === stageName);
      const alreadyCharged = stageIdx >= 0 && state.stageResults[stageIdx].charged === true;
      if (stageCost > 0 && !alreadyCharged) {
        try {
          await deductCredits(uid, stageCost, `creative:pipeline:${stageName}`, state.pipelineId);
          if (stageIdx >= 0) state.stageResults[stageIdx].charged = true;
        } catch (e) {
          state = failStage(state, stageName, 'insufficient_credits');
          try {
            await prisma.workflowRun.update({
              where: { id: state.pipelineId },
              data: { status: state.status, output: JSON.parse(JSON.stringify(state)) },
            });
          } catch { /* non-fatal */ }
          return NextResponse.json(
            { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed', state },
            { status: 402 },
          );
        }
      }
    }

    // Execute all in_progress stages concurrently
    const planTier = await getUserPlanTier(uid).catch(() => undefined as any);
    const stageResults = await Promise.allSettled(
      inProgressStages.map(async (stageName) => {
        await recordStep(state.pipelineId, stageName, 'running', { input: { productName: config.productName } }).catch(() => {});
        const ctx = initialContext(config);
        const result = await executeStage({
          stage: stageName,
          config,
          context: ctx,
          planTier,
          userId: uid,
        });
        return { stageName, result };
      }),
    );

    // Process results — on partial failure, mark successful stages completed
    let firstFailure: { stage: string; error: string } | null = null;
    for (let i = 0; i < stageResults.length; i++) {
      const res = stageResults[i];
      const stageName = inProgressStages[i];
      const stageCost = PIPELINE_COSTS[stageName] ?? 0;
      if (res.status === 'fulfilled') {
        const { result } = res.value;
        const stageIdx = state.stageResults.findIndex((r) => r.stage === stageName);
        if (stageIdx >= 0) {
          state.stageResults[stageIdx].output = result.output;
          state.stageResults[stageIdx].artifacts = result.artifacts;
        }
        await recordStep(state.pipelineId, stageName, 'completed', {
          output: result.output,
          creditsCost: stageCost,
        }).catch(() => {});
      } else {
        const errorMsg = String(res.reason instanceof Error ? res.reason.message : res.reason);
        const errorStage = res.reason instanceof PipelineStageError ? res.reason.stage : stageName;
        if (!firstFailure) firstFailure = { stage: errorStage, error: errorMsg };
        await recordStep(state.pipelineId, errorStage, 'failed', { error: errorMsg }).catch(() => {});
        if (stageCost > 0) {
          await refundCredits(uid, stageCost, `pipeline-refund:${state.pipelineId}:${errorStage}`).catch(() => {});
        }
      }
    }

    if (firstFailure) {
      // Mark successful parallel stages as completed before failing,
      // so the next advance doesn't re-execute and re-charge them.
      for (let i = 0; i < stageResults.length; i++) {
        if (stageResults[i].status === 'fulfilled') {
          const successStage = inProgressStages[i] as PipelineState['currentStage'] & string;
          if (successStage !== firstFailure.stage) {
            state = completeStage(state, successStage);
          }
        }
      }
      state = failStage(state, firstFailure.stage as PipelineState['currentStage'] & string, firstFailure.error);
      await failWorkflow(state.pipelineId, uid, firstFailure.error).catch(() => {});
    } else {
      // Advance the pipeline to mark all wave stages as completed
      state = useWaves ? advancePipelineWithWaves(state) : advancePipeline(state);
    }
    // Save updated state (with stage output and advanced status)
    try {
      await prisma.workflowRun.update({
        where: { id: state.pipelineId },
        data: { status: state.status, output: JSON.parse(JSON.stringify(state)) },
      });
    } catch { /* non-fatal */ }

    // Auto-advance loop: if the next stage has autoAdvance=true, execute it
    // immediately without waiting for a client request.
    const autoAdvanceDeadline = Date.now() + 75_000;
    const autoAdvancePlanTier = await getUserPlanTier(uid).catch(() => undefined as any);
    while (state.status === 'running' && state.currentStage && state.currentStage !== 'completed') {
      const currentStageConfig = config.stages.find((s: any) => s.stage === state.currentStage);
      if (!currentStageConfig?.autoAdvance) break;
      if (Date.now() > autoAdvanceDeadline) break;

      // Find all in_progress stages in the current wave
      const waveInProgress = state.stageResults
        .filter((r) => r.status === 'in_progress')
        .map((r) => r.stage);

      // Deduct credits for all in_progress stages (idempotent via charged flag)
      for (const waveStage of waveInProgress) {
        const waveCost = PIPELINE_COSTS[waveStage] ?? 0;
        const waveIdx = state.stageResults.findIndex((r) => r.stage === waveStage);
        const alreadyCharged = waveIdx >= 0 && state.stageResults[waveIdx].charged === true;
        if (waveCost > 0 && !alreadyCharged) {
          try {
            await deductCredits(uid, waveCost, `creative:pipeline:${waveStage}`, state.pipelineId);
            if (waveIdx >= 0) state.stageResults[waveIdx].charged = true;
          } catch (e) {
            state = failStage(state, waveStage, 'insufficient_credits');
            try {
              await prisma.workflowRun.update({
                where: { id: state.pipelineId },
                data: { status: state.status, output: JSON.parse(JSON.stringify(state)) },
              });
            } catch { /* non-fatal */ }
            return NextResponse.json(
              { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed', state },
              { status: 402 },
            );
          }
        }
      }

      // Execute all in_progress stages concurrently
      const waveResults = await Promise.allSettled(
        waveInProgress.map(async (waveStage) => {
          await recordStep(state.pipelineId, waveStage, 'running').catch(() => {});
          // Rebuild context from accumulated stage results
          let ctx = initialContext(config);
          for (const result of state.stageResults) {
            if (result.status === 'completed' || result.status === 'skipped') {
              ctx = mergeStageResultIntoContext(ctx, result.stage, { output: result.output, artifacts: result.artifacts });
            }
          }
          const result = await executeStage({
            stage: waveStage,
            config,
            context: ctx,
            planTier: autoAdvancePlanTier,
            userId: uid,
          });
          return { waveStage, result };
        }),
      );

      // Process results — on partial failure, mark successful stages completed
      let firstFailure: { stage: string; error: string } | null = null;
      for (let i = 0; i < waveResults.length; i++) {
        const res = waveResults[i];
        const waveStage = waveInProgress[i];
        const waveCost = PIPELINE_COSTS[waveStage] ?? 0;
        if (res.status === 'fulfilled') {
          const { result } = res.value;
          const stageIdx = state.stageResults.findIndex((r) => r.stage === waveStage);
          if (stageIdx >= 0) {
            state.stageResults[stageIdx].output = result.output;
            state.stageResults[stageIdx].artifacts = result.artifacts;
          }
          await recordStep(state.pipelineId, waveStage, 'completed', {
            output: result.output,
            creditsCost: waveCost,
          }).catch(() => {});
        } else {
          const errorMsg = String(res.reason instanceof Error ? res.reason.message : res.reason);
          const errorStage = res.reason instanceof PipelineStageError ? res.reason.stage : waveStage;
          if (!firstFailure) firstFailure = { stage: errorStage, error: errorMsg };
          await recordStep(state.pipelineId, errorStage, 'failed', { error: errorMsg }).catch(() => {});
          if (waveCost > 0) {
            await refundCredits(uid, waveCost, `pipeline-refund:${state.pipelineId}:${errorStage}`).catch(() => {});
          }
        }
      }

      if (firstFailure) {
        // Mark successful parallel stages as completed before failing
        for (let i = 0; i < waveResults.length; i++) {
          if (waveResults[i].status === 'fulfilled') {
            const successStage = waveInProgress[i] as PipelineState['currentStage'] & string;
            if (successStage !== firstFailure.stage) {
              state = completeStage(state, successStage);
            }
          }
        }
        state = failStage(state, firstFailure.stage as PipelineState['currentStage'] & string, firstFailure.error);
        await failWorkflow(state.pipelineId, uid, firstFailure.error).catch(() => {});
        break; // Break the auto-advance loop on failure
      }

      // Advance to mark wave stages completed and start next wave
      state = useWaves ? advancePipelineWithWaves(state) : advancePipeline(state);

      // Save state after each auto-advanced stage
      try {
        await prisma.workflowRun.update({
          where: { id: state.pipelineId },
          data: { status: state.status, output: JSON.parse(JSON.stringify(state)) },
        });
      } catch { /* non-fatal */ }
    }
  }

  return NextResponse.json({ state });
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
