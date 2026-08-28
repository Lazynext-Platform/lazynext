import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { deductCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import {
  createPipeline,
  validatePipelineConfig,
  advancePipeline,
  PIPELINE_COSTS,
  type PipelineConfig,
  type PipelineState,
  type PipelineStage,
} from '@/lib/creative/pipeline';

export const maxDuration = 60;

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
  await getUserPlanTier(uid); // plan-tier aware (no gating here, but recorded for routing)

  const body = await req.json().catch(() => ({}));

  // Accept either a full PipelineConfig or { templateId, overrides }.
  let config: PipelineConfig;
  if (body.templateId && typeof body.templateId === 'string') {
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
  state = advancePipeline(state);

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
    console.error('[creative/pipeline] persist failed:', String(e));
    // Non-fatal: return the in-memory state so the client can still drive it.
  }

  return NextResponse.json({ state });
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
