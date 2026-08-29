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

  // Deduct credits for the first stage before starting.
  const firstStage = config.stages.find((s) => s.enabled);
  if (firstStage) {
    const cost = PIPELINE_COSTS[firstStage.stage as keyof typeof PIPELINE_COSTS] ?? 0;
    if (cost > 0) {
      try {
        await deductCredits(uid, cost, `creative:pipeline:${firstStage.stage}`, state.pipelineId);
      } catch (e) {
        return NextResponse.json(
          {
            error:
              e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
          },
          { status: 402 },
        );
      }
    }
  }

  // Start the pipeline: advance from draft to the first in_progress stage.
  // Use wave-based advancement if the pipeline was built from a workflow definition.
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

  // Execute the first stage if one is now in_progress.
  if (state.currentStage && state.currentStage !== 'completed' && state.status === 'running') {
    const stage = state.currentStage;
    const ctx = initialContext(config);
    try {
      await recordStep(state.pipelineId, stage, 'running', { input: { productName: config.productName } }).catch(() => {});
      const result = await executeStage({
        stage,
        config,
        context: ctx,
        planTier: await getUserPlanTier(uid).catch(() => undefined as any),
        userId: uid,
      });
      // Merge result into stage state
      const stageIdx = state.stageResults.findIndex((r) => r.stage === stage);
      if (stageIdx >= 0) {
        state.stageResults[stageIdx].output = result.output;
        state.stageResults[stageIdx].artifacts = result.artifacts;
      }
      // Advance the pipeline to mark the stage as completed and update totalCreditsUsed
      state = useWaves ? advancePipelineWithWaves(state) : advancePipeline(state);
      await recordStep(state.pipelineId, stage, 'completed', {
        output: result.output,
        creditsCost: PIPELINE_COSTS[stage] ?? 0,
      }).catch(() => {});
    } catch (e) {
      const errorMsg = String(e instanceof Error ? e.message : e);
      const errorStage = e instanceof PipelineStageError ? e.stage : stage;
      state = failStage(state, errorStage, errorMsg);
      await recordStep(state.pipelineId, errorStage, 'failed', { error: errorMsg }).catch(() => {});
      await failWorkflow(state.pipelineId, uid, errorMsg).catch(() => {});
      // Refund the first stage credit on failure
      const cost = PIPELINE_COSTS[errorStage as keyof typeof PIPELINE_COSTS] ?? 0;
      if (cost > 0) {
        await refundCredits(uid, cost, `pipeline-refund:${state.pipelineId}:${errorStage}`).catch(() => {});
      }
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
    while (state.status === 'running' && state.currentStage && state.currentStage !== 'completed') {
      const currentStageConfig = config.stages.find((s: any) => s.stage === state.currentStage);
      if (!currentStageConfig?.autoAdvance) break;
      if (Date.now() > autoAdvanceDeadline) break;

      const nextStage = state.currentStage;
      const nextCost = PIPELINE_COSTS[nextStage] ?? 0;

      if (nextCost > 0) {
        try {
          await deductCredits(uid, nextCost, `creative:pipeline:${nextStage}`, state.pipelineId);
        } catch (e) {
          state = failStage(state, nextStage, 'insufficient_credits');
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

      try {
        await recordStep(state.pipelineId, nextStage, 'running').catch(() => {});
        // Rebuild context from accumulated stage results
        let ctx = initialContext(config);
        for (const result of state.stageResults) {
          if (result.status === 'completed' || result.status === 'skipped') {
            ctx = mergeStageResultIntoContext(ctx, result.stage, { output: result.output, artifacts: result.artifacts });
          }
        }
        const result = await executeStage({
          stage: nextStage,
          config,
          context: ctx,
          planTier: await getUserPlanTier(uid).catch(() => undefined as any),
          userId: uid,
        });
        const stageIdx = state.stageResults.findIndex((r) => r.stage === nextStage);
        if (stageIdx >= 0) {
          state.stageResults[stageIdx].output = result.output;
          state.stageResults[stageIdx].artifacts = result.artifacts;
        }
        state = useWaves ? advancePipelineWithWaves(state) : advancePipeline(state);
        await recordStep(state.pipelineId, nextStage, 'completed', {
          output: result.output,
          creditsCost: nextCost,
        }).catch(() => {});
      } catch (e) {
        const errorMsg = String(e instanceof Error ? e.message : e);
        const errorStage = e instanceof PipelineStageError ? e.stage : nextStage;
        state = failStage(state, errorStage, errorMsg);
        await recordStep(state.pipelineId, errorStage, 'failed', { error: errorMsg }).catch(() => {});
        await failWorkflow(state.pipelineId, uid, errorMsg).catch(() => {});
        if (nextCost > 0) {
          await refundCredits(uid, nextCost, `pipeline-refund:${state.pipelineId}:${errorStage}`).catch(() => {});
        }
        break; // Break the auto-advance loop on failure
      }

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
