import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { deductCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { checkAuthRateLimit, getClientIP } from '@/lib/auth-rate-limit';
import {
  advancePipeline,
  advancePipelineWithWaves,
  pausePipeline,
  resumePipeline,
  cancelPipeline,
  skipStage,
  retryStage,
  failStage,
  PIPELINE_COSTS,
  type PipelineState,
  type PipelineStage,
} from '@/lib/creative/pipeline';
import { executeStage, initialContext, mergeStageResultIntoContext, type StageContext } from '@/lib/creative/pipeline-executor';
import { recordStep, completeWorkflow, failWorkflow } from '@/lib/workflow/engine';
import { persistAsset, derivePipelineChildAssets } from '@/lib/creative/asset-persist';

export const maxDuration = 90;

/** Load a persisted pipeline state (WorkflowRun row) owned by the user. */
async function loadPipeline(uid: string, id: string): Promise<PipelineState | null> {
  const run = await prisma.workflowRun.findFirst({
    where: { id, userId: uid, workflowType: 'creative-pipeline' },
  });
  if (!run) return null;
  try {
    const state = typeof run.output === 'string' ? JSON.parse(run.output) : run.output;
    if (state && typeof state === 'object' && 'pipelineId' in state) return state as PipelineState;
  } catch {
    /* ignore */
  }
  return null;
}

/** Persist the pipeline state back to its WorkflowRun row. */
async function savePipeline(state: PipelineState): Promise<void> {
  try {
    await prisma.workflowRun.update({
      where: { id: state.pipelineId },
      data: {
        status: state.status,
        output: JSON.parse(JSON.stringify(state)),
        completedAt: state.status === 'completed' || state.status === 'failed' ? new Date() : undefined,
      },
    });
  } catch (e) {
    console.error('[creative/pipeline/[id]] persist failed:', String(e));
  }
}

/**
 * Persist pipeline-generated outputs as Asset records so they appear in the
 * asset library and can be browsed, reused, and approved. Creates a parent
 * "creative_package" asset and individual child assets for each material
 * output (media, audio, edit, compliance, publish).
 */
async function persistPipelineAssets(uid: string, state: PipelineState): Promise<void> {
  const pipelineName = state.config.name || `Pipeline ${state.pipelineId.slice(0, 8)}`;
  const packageId = await persistAsset(
    uid,
    'creative_package',
    `${pipelineName} — ${new Date().toISOString().slice(0, 16)}`,
    {
      pipelineId: state.pipelineId,
      totalCreditsUsed: state.totalCreditsUsed,
      stages: state.stageResults.map((r) => r.stage),
      createdAt: new Date().toISOString(),
    },
  );

  const childSpecs = derivePipelineChildAssets(state);
  for (const spec of childSpecs) {
    await persistAsset(uid, spec.type, spec.name, spec.data, packageId || undefined, spec.tags);
  }
}

/**
 * Rebuild a StageContext from the pipeline's accumulated stage results.
 * This allows the executor to access prior stage outputs when running a
 * new stage (e.g. the script stage needs the brief from the brief stage).
 */
function rebuildContext(state: PipelineState): StageContext {
  let ctx: StageContext = initialContext(state.config);
  for (const result of state.stageResults) {
    if (result.status === 'completed' || result.status === 'skipped') {
      ctx = mergeStageResultIntoContext(ctx, result.stage, { output: result.output, artifacts: result.artifacts });
    }
  }
  return ctx;
}

/**
 * GET /api/creative/pipeline/[id]
 * Returns the current pipeline state.
 */
async function __byokGET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  const state = await loadPipeline(uid, id);
  if (!state) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ state });
}

/**
 * POST /api/creative/pipeline/[id]
 * Body: { action: 'advance' | 'pause' | 'resume' | 'cancel' | 'skip' | 'retry' | 'fail', stage?, error? }
 *
 * - advance: complete the current stage and start the next (deducts credits for the next stage).
 * - pause / resume / cancel: lifecycle control.
 * - skip: skip a specific stage (body.stage).
 * - retry: retry a failed stage (body.stage).
 * - fail: mark a stage as failed (body.stage, body.error).
 */
async function __byokPOST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  // Rate limit: 20 pipeline advances per minute per IP
  const ip = getClientIP(req);
  const rl = checkAuthRateLimit(ip, 'pipeline-advance', 20, 60_000);
  if (rl.limited) {
    return NextResponse.json({ error: 'rate_limited', retryAfter: rl.retryAfter }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } });
  }

  let state = await loadPipeline(uid, id);
  if (!state) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');

  switch (action) {
    case 'advance': {
      // Deduct credits for the stage we are about to start (the next pending one).
      if (state.currentStage && state.status === 'running') {
        // No-op: current stage already paid for when it started.
      }
      const before = state.currentStage;
      // Use wave-based advancement if any stage has parallelWith configured
      const hasParallel = state.config.stages.some((s: any) => s.parallelWith && s.parallelWith.length > 0);
      state = hasParallel ? advancePipelineWithWaves(state) : advancePipeline(state);
      // If we advanced to a new running stage, deduct its cost and execute it.
      if (state.currentStage && state.currentStage !== before && state.currentStage !== 'completed') {
        const cost = PIPELINE_COSTS[state.currentStage] ?? 0;
        if (cost > 0) {
          try {
            await deductCredits(uid, cost, `creative:pipeline:${state.currentStage}`, state.pipelineId);
          } catch (e) {
            // Mark the new stage as failed if we can't pay for it.
            state = failStage(state, state.currentStage, 'insufficient_credits');
            await savePipeline(state);
            return NextResponse.json(
              {
                error:
                  e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
                state,
              },
              { status: 402 },
            );
          }
        }
        // Execute the stage (real generation work)
        const stage = state.currentStage;
        try {
          await recordStep(state.pipelineId, stage, 'running').catch(() => {});
          // Rebuild context from prior stage results
          const ctx = rebuildContext(state);
          const result = await executeStage({
            stage,
            config: state.config,
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
          state = hasParallel ? advancePipelineWithWaves(state) : advancePipeline(state);
          await recordStep(state.pipelineId, stage, 'completed', {
            output: result.output,
            creditsCost: cost,
          }).catch(() => {});
        } catch (e) {
          const errorMsg = String(e instanceof Error ? e.message : e);
          state = failStage(state, stage, errorMsg);
          await recordStep(state.pipelineId, stage, 'failed', { error: errorMsg }).catch(() => {});
          await failWorkflow(state.pipelineId, uid, errorMsg).catch(() => {});
          // Refund the stage credit on failure
          if (cost > 0) {
            const { refundSync } = await import('@/lib/lazynext-studio/gen-task');
            await refundSync(uid, cost, `pipeline-refund:${state.pipelineId}:${stage}`).catch(() => {});
          }
          await savePipeline(state);
          return NextResponse.json({ error: 'stage_failed', detail: errorMsg, state }, { status: 500 });
        }
      } else if (state.status === 'completed') {
        // Pipeline completed — record workflow completion
        await completeWorkflow(
          state.pipelineId,
          uid,
          { pipelineId: state.pipelineId, totalCreditsUsed: state.totalCreditsUsed },
          Date.now() - Date.parse(state.createdAt),
        ).catch(() => {});
        // Persist generated outputs as assets for the asset library
        await persistPipelineAssets(uid, state).catch(() => {});
      }
      break;
    }
    case 'pause': {
      state = pausePipeline(state);
      break;
    }
    case 'resume': {
      state = resumePipeline(state);
      break;
    }
    case 'cancel': {
      state = cancelPipeline(state);
      break;
    }
    case 'skip': {
      const stage = String(body.stage || '');
      if (stage) state = skipStage(state, stage as PipelineState['currentStage'] & string);
      break;
    }
    case 'retry': {
      const stage = String(body.stage || '');
      if (stage) {
        state = retryStage(state, stage as PipelineState['currentStage'] & string);
        // Re-deduct credits for the retried stage.
        const cost = PIPELINE_COSTS[stage as keyof typeof PIPELINE_COSTS] ?? 0;
        if (cost > 0) {
          try {
            await deductCredits(uid, cost, `creative:pipeline:${stage}:retry`, state.pipelineId);
          } catch (e) {
            state = failStage(state, stage as PipelineState['currentStage'] & string, 'insufficient_credits');
            await savePipeline(state);
            return NextResponse.json(
              {
                error:
                  e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
                state,
              },
              { status: 402 },
            );
          }
        }
        // Re-execute the stage
        try {
          await recordStep(state.pipelineId, stage, 'running').catch(() => {});
          const ctx = rebuildContext(state);
          const result = await executeStage({
            stage: stage as PipelineStage,
            config: state.config,
            context: ctx,
            planTier: await getUserPlanTier(uid).catch(() => undefined as any),
            userId: uid,
          });
          const stageIdx = state.stageResults.findIndex((r) => r.stage === stage);
          if (stageIdx >= 0) {
            state.stageResults[stageIdx].output = result.output;
            state.stageResults[stageIdx].artifacts = result.artifacts;
          }
          // Advance to mark the stage as completed and update totalCreditsUsed
          const hasParallel = state.config.stages.some((s: any) => s.parallelWith && s.parallelWith.length > 0);
          state = hasParallel ? advancePipelineWithWaves(state) : advancePipeline(state);
          await recordStep(state.pipelineId, stage, 'completed', {
            output: result.output,
            creditsCost: cost,
          }).catch(() => {});
        } catch (e) {
          const errorMsg = String(e instanceof Error ? e.message : e);
          state = failStage(state, stage as PipelineState['currentStage'] & string, errorMsg);
          await recordStep(state.pipelineId, stage, 'failed', { error: errorMsg }).catch(() => {});
          // Refund the retried stage credit on failure
          if (cost > 0) {
            const { refundSync } = await import('@/lib/lazynext-studio/gen-task');
            await refundSync(uid, cost, `pipeline-refund:${state.pipelineId}:${stage}:retry`).catch(() => {});
          }
        }
      }
      break;
    }
    case 'fail': {
      const stage = String(body.stage || state.currentStage || '');
      const error = String(body.error || 'stage_failed');
      if (stage) state = failStage(state, stage as PipelineState['currentStage'] & string, error);
      break;
    }
    case 'approve': {
      // Re-run the publish stage with onComplete='publish' to actually
      // call publishContent. This turns a 'pending_review' plan into a
      // real publish (subject to dry-run safety in the publisher).
      const publishResult = state.stageResults.find((r) => r.stage === 'publish');
      if (!publishResult) {
        return NextResponse.json({ error: 'no_publish_stage' }, { status: 400 });
      }
      // Update config to force publish mode
      state.config.onComplete = 'publish';
      try {
        const ctx = rebuildContext(state);
        const result = await executeStage({
          stage: 'publish',
          config: state.config,
          context: ctx,
          planTier: await getUserPlanTier(uid).catch(() => undefined as any),
          userId: uid,
        });
        const stageIdx = state.stageResults.findIndex((r) => r.stage === 'publish');
        if (stageIdx >= 0) {
          state.stageResults[stageIdx].output = result.output;
          state.stageResults[stageIdx].artifacts = result.artifacts;
        }
        await recordStep(state.pipelineId, 'publish', 'completed', {
          output: result.output,
          creditsCost: 0, // No additional charge for approval re-run
        }).catch(() => {});
      } catch (e) {
        const errorMsg = String(e instanceof Error ? e.message : e);
        state = failStage(state, 'publish', errorMsg);
        await recordStep(state.pipelineId, 'publish', 'failed', { error: errorMsg }).catch(() => {});
      }
      break;
    }
    default:
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }

  await savePipeline(state);
  return NextResponse.json({ state });
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
