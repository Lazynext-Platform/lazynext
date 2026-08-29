import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { deductCredits, refundCredits } from '@/lib/credits';
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
  completeStage,
  PIPELINE_COSTS,
  type PipelineState,
  type PipelineStage,
} from '@/lib/creative/pipeline';
import { executeStage, initialContext, mergeStageResultIntoContext, type StageContext, PipelineStageError } from '@/lib/creative/pipeline-executor';
import { recordStep, completeWorkflow, failWorkflow } from '@/lib/workflow/engine';
import { persistAsset, derivePipelineChildAssets } from '@/lib/creative/asset-persist';
import { logToolExecution } from '@/lib/telemetry';

export const maxDuration = 90;

/** Load a persisted pipeline state (WorkflowRun row) owned by the user.
 *  Also captures the DB-level version for optimistic locking.
 */
async function loadPipeline(uid: string, id: string): Promise<PipelineState | null> {
  const run = await prisma.workflowRun.findFirst({
    where: { id, userId: uid, workflowType: 'creative-pipeline' },
  });
  if (!run) return null;
  try {
    const state = typeof run.output === 'string' ? JSON.parse(run.output) : run.output;
    if (state && typeof state === 'object' && 'pipelineId' in state) {
      const parsed = state as PipelineState;
      // Sync the DB version onto the state for optimistic locking
      parsed.version = (run as any).version ?? parsed.version ?? 0;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Persist the pipeline state back to its WorkflowRun row.
 *  Uses optimistic locking: the update only succeeds if the stored version
 *  matches the expected version. If another request already wrote a newer
 *  version, this save is rejected to prevent clobbering.
 *  Returns true if the save succeeded, false if a version conflict occurred.
 */
async function savePipeline(state: PipelineState, expectedVersion?: number): Promise<boolean> {
  const expected = expectedVersion ?? state.version;
  const nextVersion = expected + 1;
  try {
    // Use updateMany with a version condition for optimistic locking.
    // If the stored version doesn't match expected, 0 rows are updated.
    const res = await prisma.workflowRun.updateMany({
      where: { id: state.pipelineId, version: expected },
      data: {
        status: state.status,
        output: JSON.parse(JSON.stringify(state)),
        version: nextVersion,
        completedAt: state.status === 'completed' || state.status === 'failed' ? new Date() : undefined,
      },
    });
    if (res.count === 0) {
      // Version conflict — another request already wrote a newer version
      console.warn(`[pipeline] Optimistic lock conflict for pipeline ${state.pipelineId}: expected version ${expected}, but it was already updated`);
      return false;
    }
    state.version = nextVersion;
    return true;
  } catch (e) {
    logToolExecution({
      tool: 'pipeline_workflow_run_persist',
      userId: 'system',
      cost: 0,
      durationMs: 0,
      success: false,
      error: String(e),
    });
  }
  return false;
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

  const loaded = await loadPipeline(uid, id);
  if (!loaded) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let state: PipelineState = loaded;

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
              await deductCredits(uid, stageCost, `creative:pipeline:${stageName}`, state.pipelineId, `pipeline:${state.pipelineId}:${stageName}`);
              if (stageIdx >= 0) state.stageResults[stageIdx].charged = true;
            } catch (e) {
              state = failStage(state, stageName, 'insufficient_credits');
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
        }

        // Execute all in_progress stages (concurrently for parallel stages)
        const planTier = await getUserPlanTier(uid).catch(() => undefined as any);
        const stageResults = await Promise.allSettled(
          inProgressStages.map(async (stageName) => {
            await recordStep(state.pipelineId, stageName, 'running').catch(() => {});
            const ctx = rebuildContext(state);
            const result = await executeStage({
              stage: stageName,
              config: state.config,
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
            // Refund the failed stage credit
            if (stageCost > 0) {
              await refundCredits(uid, stageCost, `pipeline-refund:${state.pipelineId}:${errorStage}`).catch(() => {});
            }
          }
        }

        if (firstFailure) {
          // Mark successful parallel stages as completed before failing
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
          await savePipeline(state);
          return NextResponse.json({ error: 'stage_failed', detail: firstFailure.error, stage: firstFailure.stage, state }, { status: 500 });
        }

        // Advance the pipeline to mark all wave stages as completed and start next wave
        state = hasParallel ? advancePipelineWithWaves(state) : advancePipeline(state);
      }

      // Auto-advance loop: if the next stage has autoAdvance=true, execute it
      // immediately without waiting for a client request. Bounded by time to
      // avoid exceeding the worker maxDuration.
      const autoAdvanceDeadline = Date.now() + 75_000; // 75s budget for auto-advance chain
      const autoAdvancePlanTier = await getUserPlanTier(uid).catch(() => undefined as any);
      let autoAdvanceCount = 0;
      while (state.status === 'running' && state.currentStage && state.currentStage !== 'completed') {
        // Check if the current stage has autoAdvance enabled
        const currentStageConfig = state.config.stages.find((s: any) => s.stage === state.currentStage);
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
              await deductCredits(uid, waveCost, `creative:pipeline:${waveStage}`, state.pipelineId, `pipeline:${state.pipelineId}:${waveStage}`);
              if (waveIdx >= 0) state.stageResults[waveIdx].charged = true;
            } catch (e) {
              state = failStage(state, waveStage, 'insufficient_credits');
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
        }

        // Execute all in_progress stages concurrently
        const waveResults = await Promise.allSettled(
          waveInProgress.map(async (waveStage) => {
            await recordStep(state.pipelineId, waveStage, 'running').catch(() => {});
            const ctx = rebuildContext(state);
            const result = await executeStage({
              stage: waveStage,
              config: state.config,
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
          await savePipeline(state);
          return NextResponse.json({ error: 'stage_failed', detail: firstFailure.error, stage: firstFailure.stage, state }, { status: 500 });
        }

        // Advance to mark wave stages completed and start next wave
        state = hasParallel ? advancePipelineWithWaves(state) : advancePipeline(state);
        autoAdvanceCount++;

        // Persist state after each auto-advanced wave (T4: per-wave persistence)
        const waveSaved = await savePipeline(state);
        if (!waveSaved) {
          // Version conflict — stop the auto-advance chain and return the current state
          return NextResponse.json({ error: 'version_conflict', message: 'Pipeline state was modified by another request. Please refresh and try again.', state }, { status: 409 });
        }
      }

      // Log auto-advance telemetry
      if (autoAdvanceCount > 0) {
        logToolExecution({
          tool: 'pipeline_auto_advance',
          userId: uid,
          cost: 0,
          durationMs: 75_000 - Math.max(0, autoAdvanceDeadline - Date.now()),
          success: true,
        });
      }

      if (state.status === 'completed') {
        // Pipeline completed — record workflow completion
        await completeWorkflow(
          state.pipelineId,
          uid,
          { pipelineId: state.pipelineId, totalCreditsUsed: state.totalCreditsUsed },
          Date.now() - Date.parse(state.createdAt),
        ).catch(() => {});
        // Persist generated outputs as assets for the asset library
        // Log failures to telemetry but don't block the pipeline completion
        await persistPipelineAssets(uid, state).catch((e) => {
          logToolExecution({
            tool: 'persist_pipeline_assets',
            userId: uid,
            cost: 0,
            durationMs: 0,
            success: false,
            error: String(e),
          });
        });
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
        // Re-deduct credits for the retried stage (retryStage resets charged=false).
        const cost = PIPELINE_COSTS[stage as keyof typeof PIPELINE_COSTS] ?? 0;
        if (cost > 0) {
          try {
            await deductCredits(uid, cost, `creative:pipeline:${stage}:retry`, state.pipelineId, `pipeline:${state.pipelineId}:${stage}:retry`);
            const retryIdx = state.stageResults.findIndex((r) => r.stage === stage);
            if (retryIdx >= 0) state.stageResults[retryIdx].charged = true;
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

          // Auto-advance after successful retry (same loop as 'advance' case)
          const retryDeadline = Date.now() + 75_000;
          const retryPlanTier = await getUserPlanTier(uid).catch(() => undefined as any);
          while (state.status === 'running' && state.currentStage && state.currentStage !== 'completed') {
            const currentStageConfig = state.config.stages.find((s: any) => s.stage === state.currentStage);
            if (!currentStageConfig?.autoAdvance) break;
            if (Date.now() > retryDeadline) break;

            const waveInProgress = state.stageResults
              .filter((r) => r.status === 'in_progress')
              .map((r) => r.stage);

            for (const waveStage of waveInProgress) {
              const waveCost = PIPELINE_COSTS[waveStage] ?? 0;
              const waveIdx = state.stageResults.findIndex((r) => r.stage === waveStage);
              const alreadyCharged = waveIdx >= 0 && state.stageResults[waveIdx].charged === true;
              if (waveCost > 0 && !alreadyCharged) {
                try {
                  await deductCredits(uid, waveCost, `creative:pipeline:${waveStage}`, state.pipelineId, `pipeline:${state.pipelineId}:${waveStage}`);
                  if (waveIdx >= 0) state.stageResults[waveIdx].charged = true;
                } catch (e) {
                  state = failStage(state, waveStage, 'insufficient_credits');
                  await savePipeline(state);
                  return NextResponse.json(
                    { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed', state },
                    { status: 402 },
                  );
                }
              }
            }

            const waveResults = await Promise.allSettled(
              waveInProgress.map(async (waveStage) => {
                await recordStep(state.pipelineId, waveStage, 'running').catch(() => {});
                const ctx = rebuildContext(state);
                const result = await executeStage({
                  stage: waveStage,
                  config: state.config,
                  context: ctx,
                  planTier: retryPlanTier,
                  userId: uid,
                });
                return { waveStage, result };
              }),
            );

            let retryFailure: { stage: string; error: string } | null = null;
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
                if (!retryFailure) retryFailure = { stage: errorStage, error: errorMsg };
                await recordStep(state.pipelineId, errorStage, 'failed', { error: errorMsg }).catch(() => {});
                if (waveCost > 0) {
                  await refundCredits(uid, waveCost, `pipeline-refund:${state.pipelineId}:${errorStage}`).catch(() => {});
                }
              }
            }

            if (retryFailure) {
              // Mark successful parallel stages as completed before failing
              for (let i = 0; i < waveResults.length; i++) {
                if (waveResults[i].status === 'fulfilled') {
                  const successStage = waveInProgress[i] as PipelineState['currentStage'] & string;
                  if (successStage !== retryFailure.stage) {
                    state = completeStage(state, successStage);
                  }
                }
              }
              state = failStage(state, retryFailure.stage as PipelineState['currentStage'] & string, retryFailure.error);
              await failWorkflow(state.pipelineId, uid, retryFailure.error).catch(() => {});
              break;
            }

            state = hasParallel ? advancePipelineWithWaves(state) : advancePipeline(state);
            // Persist state after each retry auto-advance wave
            const retrySaved = await savePipeline(state);
            if (!retrySaved) {
              return NextResponse.json({ error: 'version_conflict', message: 'Pipeline state was modified by another request. Please refresh and try again.', state }, { status: 409 });
            }
          }
        } catch (e) {
          const errorMsg = String(e instanceof Error ? e.message : e);
          const errorStage = e instanceof PipelineStageError ? e.stage : stage;
          state = failStage(state, errorStage as PipelineState['currentStage'] & string, errorMsg);
          await recordStep(state.pipelineId, errorStage, 'failed', { error: errorMsg }).catch(() => {});
          // Refund the retried stage credit on failure
          if (cost > 0) {
            await refundCredits(uid, cost, `pipeline-refund:${state.pipelineId}:${errorStage}:retry`).catch(() => {});
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

  const saved = await savePipeline(state);
  if (!saved) {
    return NextResponse.json({ error: 'version_conflict', message: 'Pipeline state was modified by another request. Please refresh and try again.' }, { status: 409 });
  }
  return NextResponse.json({ state });
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
