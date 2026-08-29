import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { withAtlas } from '@/lib/request-context';
import { metaAds } from '@/lib/ad-platforms/meta';
import { googleAds } from '@/lib/ad-platforms/google';
import {
  generateJobId,
  determineWinner,
  summarizeJob,
  buildAutomationMetadata,
  parseAutomationMetadata,
  applyWinnerTag,
  AUTOMATION_COST,
  type AutomationJob,
  type AutomationStatus,
  type AutomationVariant,
} from '@/lib/creative/ab-automation';

export const maxDuration = 90;

/**
 * GET /api/creative/ab-automation
 * List all automation jobs for the authenticated user.
 * Jobs are stored as AdCampaign records with __automation metadata.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const winnersOnly = url.searchParams.get('winners') === 'true';

  // If winners=true, return creations tagged with abTestWinner
  if (winnersOnly) {
    const creations = await prisma.creation.findMany({
      where: { userId: uid, status: 'completed' },
      select: { id: true, outputs: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }).catch(() => []);

    const winners: Array<{ id: string; testName?: string; winnerAt?: string }> = [];
    for (const c of creations) {
      try {
        const outputs = typeof c.outputs === 'string' ? JSON.parse(c.outputs) : c.outputs;
        if (outputs && outputs.abTestWinner) {
          winners.push({
            id: c.id,
            testName: outputs.abTestJobId || undefined,
            winnerAt: outputs.abTestWinnerAt || c.createdAt.toISOString(),
          });
        }
      } catch { /* skip malformed outputs */ }
    }
    return NextResponse.json({ winners });
  }

  // Find all campaigns that have automation metadata
  const campaigns = await prisma.adCampaign.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);

  const jobs: AutomationJob[] = [];
  const seenJobIds = new Set<string>();

  for (const c of campaigns) {
    const auto = parseAutomationMetadata(c.metrics);
    if (!auto) continue;
    const job = auto as unknown as AutomationJob;
    if (job.jobId && !seenJobIds.has(job.jobId)) {
      seenJobIds.add(job.jobId);
      jobs.push(job);
    }
  }

  return NextResponse.json({ jobs });
}

/**
 * POST /api/creative/ab-automation
 * Start a new A/B automation job.
 *
 * Body: {
 *   creationIds: string[],     — creative variants to test
 *   platform: 'meta' | 'google',
 *   testName: string,
 *   primaryMetric?: 'roas' | 'ctr' | 'cvr',  — default 'roas'
 *   budgetDaily?: number,
 *   dryRun?: boolean,
 * }
 *
 * The automation:
 *   1. Uses AI to generate test hypotheses
 *   2. Creates A/B test campaigns with equal budget
 *   3. Returns the job state for monitoring
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const creationIds = Array.isArray(body.creationIds) ? body.creationIds.filter((id: unknown) => typeof id === 'string') : [];
  const platform = String(body.platform || '');
  const testName = String(body.testName || '').slice(0, 200); // bound length
  const primaryMetric = String(body.primaryMetric || 'roas');
  const budgetDaily = typeof body.budgetDaily === 'number' ? Math.min(Math.max(body.budgetDaily, 1), 10000) : 10; // bound 1–10000
  const dryRun = body.dryRun !== false; // default dry-run for safety
  const workflowTemplateId = typeof body.workflowTemplateId === 'string' ? body.workflowTemplateId : '';

  if (creationIds.length < 2) {
    return NextResponse.json({ error: 'min_2_variants' }, { status: 400 });
  }
  if (creationIds.length > 10) {
    return NextResponse.json({ error: 'max_10_variants' }, { status: 400 });
  }
  if (!platform || !['meta', 'google'].includes(platform)) {
    return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
  }
  if (!testName) {
    return NextResponse.json({ error: 'test_name_required' }, { status: 400 });
  }

  // Validate that all creationIds belong to the user
  const ownedCreations = await prisma.creation.findMany({
    where: { id: { in: creationIds }, userId: uid },
    select: { id: true },
  }).catch(() => []);
  const ownedIds = new Set(ownedCreations.map((c) => c.id));
  const unowned = creationIds.filter((id: string) => !ownedIds.has(id));
  if (unowned.length > 0) {
    return NextResponse.json({ error: 'creation_ownership_error', detail: 'One or more creations do not belong to the user' }, { status: 403 });
  }

  // Deduct credits
  try {
    await deductCredits(uid, AUTOMATION_COST, `ab-automation:${testName}`);
  } catch {
    return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 });
  }

  const jobId = generateJobId();
  const planTier = await getUserPlanTier(uid);

  try {
    // ── Step 1: AI generates test hypotheses ──
    const labels = creationIds.map((_id: string, i: number) => String.fromCharCode(65 + i)); // A, B, C...
    const hypothesisPrompt = `You are an A/B testing expert for e-commerce ads. Given ${creationIds.length} creative variants labeled ${labels.join(', ')}, generate:
1. A test hypothesis (what you expect to happen)
2. The primary metric to optimize (${primaryMetric})
3. Why these variants might perform differently

Keep it concise (3-4 sentences). Return only the text.`;

    let hypothesis = 'Testing which creative variant drives the highest ' + primaryMetric.toUpperCase() + '.';
    try {
      hypothesis = await atlasChat(
        [{ role: 'system', content: 'You are an A/B testing expert.' }, { role: 'user', content: hypothesisPrompt }],
        getLLMModel(planTier),
        500,
      );
    } catch {
      // Use default hypothesis on AI failure
    }

    // ── Step 2: Create campaigns for each variant ──
    const provider = platform === 'meta' ? metaAds : googleAds;
    const perVariantBudget = budgetDaily / creationIds.length;
    const variants: AutomationVariant[] = [];

    for (let i = 0; i < creationIds.length; i++) {
      const creationId = creationIds[i];
      const label = labels[i];
      const campaignName = `[AUTO] ${testName} — Variant ${label}`;

      // Create campaign in DB
      const campaign = await prisma.adCampaign.create({
        data: {
          userId: uid,
          platform,
          name: campaignName,
          status: 'active',
          budgetDaily: perVariantBudget,
          currency: 'USD',
          creativeIds: [creationId],
          metrics: JSON.parse(JSON.stringify(buildAutomationMetadata({
            jobId,
            status: 'monitoring' as AutomationStatus,
            testName,
            platform,
            primaryMetric,
            startedAt: new Date().toISOString(),
            confidenceLevel: 0.90,
          }))),
        },
      });

      // Try to create on platform (dry-run safe)
      if (!dryRun) {
        try {
          const result = await provider.createCampaign({
            platform: platform as 'meta' | 'google',
            name: campaignName,
            budgetDaily: perVariantBudget,
            currency: 'USD',
            creativeIds: [creationId],
          }, {});
          await prisma.adCampaign.update({
            where: { id: campaign.id },
            data: { campaignId: result.campaignId },
          });
        } catch {
          // Platform creation failed — campaign stays in DB with dry-run status
        }
      }

      variants.push({
        creationId,
        label,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0,
        ctr: 0,
        cvr: 0,
        roas: 0,
      });
    }

    const job: AutomationJob = {
      jobId,
      status: 'monitoring',
      testName,
      platform,
      primaryMetric,
      variants,
      confidenceLevel: 0.90,
      startedAt: new Date().toISOString(),
    };

    // ── Optional: Run a workflow per variant ──
    // If a workflowTemplateId is provided, create and execute a pipeline for
    // each variant using the real stage executor. Each pipeline runs through
    // all enabled stages (brief → script → storyboard → …) with actual
    // creative generation, and records WorkflowStep rows via engine.ts.
    if (workflowTemplateId) {
      try {
        const { configFromTemplate, createPipeline, advancePipeline, failStage, PIPELINE_COSTS } = await import('@/lib/creative/pipeline');
        const { executeStage, initialContext } = await import('@/lib/creative/pipeline-executor');
        const { startWorkflow, recordStep, completeWorkflow, failWorkflow } = await import('@/lib/workflow/engine');
        for (let i = 0; i < creationIds.length; i++) {
          const creationId = creationIds[i];
          const config = configFromTemplate(workflowTemplateId, {
            name: `${testName} — Variant ${labels[i]}`,
            productName: `Variant ${labels[i]}`,
          });
          if (config) {
            let state = createPipeline(config);
            state = advancePipeline(state);
            // Persist as a WorkflowRun row
            try {
              await prisma.workflowRun.create({
                data: {
                  id: state.pipelineId,
                  userId: uid,
                  workflowType: 'ab-variant-workflow',
                  status: state.status,
                  input: JSON.parse(JSON.stringify({ ...config, abJobId: jobId, variantLabel: labels[i], creationId })),
                  output: JSON.parse(JSON.stringify(state)),
                },
              });
            } catch {
              // Non-fatal: pipeline state is returned in-memory
            }
            // Record workflow start via engine (for Analytics Hub)
            await startWorkflow(uid, 'ab-variant-workflow', { pipelineId: state.pipelineId, abJobId: jobId, variantLabel: labels[i] }).catch(() => {});
            // Execute stages sequentially
            let ctx = initialContext(config);
            while (state.status === 'running' && state.currentStage && state.currentStage !== 'completed') {
              const stage = state.currentStage;
              try {
                await recordStep(state.pipelineId, stage, 'running').catch(() => {});
                const result = await executeStage({ stage, config, context: ctx, planTier, userId: uid });
                ctx = (await import('@/lib/creative/pipeline-executor')).mergeStageResultIntoContext(ctx, stage, result);
                const stageIdx = state.stageResults.findIndex((r) => r.stage === stage);
                if (stageIdx >= 0) {
                  state.stageResults[stageIdx].output = result.output;
                  state.stageResults[stageIdx].artifacts = result.artifacts;
                }
                await recordStep(state.pipelineId, stage, 'completed', {
                  output: result.output,
                  creditsCost: PIPELINE_COSTS[stage] ?? 0,
                }).catch(() => {});
              } catch (e) {
                const errorMsg = String(e instanceof Error ? e.message : e);
                state = failStage(state, stage, errorMsg);
                await recordStep(state.pipelineId, stage, 'failed', { error: errorMsg }).catch(() => {});
                await failWorkflow(state.pipelineId, uid, errorMsg).catch(() => {});
                break;
              }
              // Advance to next stage
              state = advancePipeline(state);
              // Save state
              try {
                await prisma.workflowRun.update({
                  where: { id: state.pipelineId },
                  data: { status: state.status, output: JSON.parse(JSON.stringify(state)) },
                });
              } catch { /* non-fatal */ }
            }
            if (state.status === 'completed') {
              await completeWorkflow(state.pipelineId, uid, { pipelineId: state.pipelineId }, Date.now() - Date.parse(state.createdAt)).catch(() => {});
            }
          }
        }
      } catch {
        // Workflow execution is best-effort — don't fail the A/B test
      }
    }

    return NextResponse.json({ job, hypothesis }, { status: 201 });

  } catch (err) {
    await refundSync(uid, AUTOMATION_COST, `ab-automation-refund:${jobId}`);
    return NextResponse.json({
      error: 'automation_failed',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);

/**
 * PATCH /api/creative/ab-automation
 * Check and update automation jobs — fetches latest metrics, checks for winner.
 * Body: { jobId: string }
 */
async function __byokPATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const jobId = String(body.jobId || '');
  if (!jobId) return NextResponse.json({ error: 'jobId_required' }, { status: 400 });

  // Find all campaigns for this job
  const campaigns = await prisma.adCampaign.findMany({
    where: { userId: uid },
  }).catch(() => []);

  const jobCampaigns = campaigns.filter(c => {
    const auto = parseAutomationMetadata(c.metrics);
    return auto?.jobId === jobId;
  });

  if (jobCampaigns.length === 0) {
    return NextResponse.json({ error: 'job_not_found' }, { status: 404 });
  }

  // Fetch latest metrics for each campaign
  const provider = jobCampaigns[0].platform === 'meta' ? metaAds : googleAds;
  const variants: AutomationVariant[] = [];
  let primaryMetric = 'roas';
  let testName = '';
  let startedAt = new Date().toISOString();

  for (const c of jobCampaigns) {
    const auto = parseAutomationMetadata(c.metrics) as Record<string, unknown> | null;
    if (auto?.primaryMetric) primaryMetric = String(auto.primaryMetric);
    if (auto?.testName) testName = String(auto.testName);
    if (auto?.startedAt) startedAt = String(auto.startedAt);

    const creativeIds = Array.isArray(c.creativeIds) ? c.creativeIds : [];
    const creationId = String(creativeIds[0] || '');
    const label = String(c.name.match(/Variant\s+([A-E])/)?.[1] || '?');

    let metrics = (c.metrics || {}) as Record<string, unknown>;
    const autoMeta = parseAutomationMetadata(metrics);
    if (c.campaignId && !autoMeta?.dryRun) {
      try {
        const freshMetrics = await provider.getMetrics(c.campaignId);
        metrics = freshMetrics as unknown as Record<string, unknown>;
      } catch {
        // Use stored metrics
      }
    }

    const m = metrics as Record<string, number>;
    variants.push({
      creationId,
      label,
      impressions: m.impressions || 0,
      clicks: m.clicks || 0,
      conversions: m.conversions || 0,
      spend: m.spend || 0,
      revenue: m.revenue || 0,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      cvr: m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0,
      roas: m.spend > 0 ? m.revenue / m.spend : 0,
    });
  }

  // Check for winner
  const winnerId = determineWinner(variants, primaryMetric);
  const status: AutomationStatus = winnerId ? 'completed' : 'monitoring';

  const job: AutomationJob = {
    jobId,
    status,
    testName,
    platform: jobCampaigns[0].platform,
    primaryMetric,
    variants,
    confidenceLevel: 0.90,
    startedAt,
    ...(winnerId ? { winner: winnerId, completedAt: new Date().toISOString() } : {}),
  };

  // If we have a winner, pause losing campaigns and boost winner
  if (winnerId) {
    for (const c of jobCampaigns) {
      const creativeIds = Array.isArray(c.creativeIds) ? c.creativeIds : [];
      const isWinner = creativeIds[0] === winnerId;
      try {
        await prisma.adCampaign.update({
          where: { id: c.id },
          data: {
            status: isWinner ? 'active' : 'paused',
            ...(isWinner ? { budgetDaily: (c.budgetDaily || 0) * 2 } : {}),
            metrics: JSON.parse(JSON.stringify({
              ...((c.metrics || {}) as Record<string, unknown>),
              ...buildAutomationMetadata(job),
            })),
          },
        });
        if (c.campaignId && !isWinner) {
          try { await provider.pauseCampaign(c.campaignId); } catch { /* dry-run safe */ }
        }
      } catch {
        // Continue even if update fails
      }
    }

    // ── Winner feedback loop: tag the winning creation in outputs JSON ──
    try {
      const winningCreation = await prisma.creation.findUnique({
        where: { id: winnerId },
        select: { id: true, outputs: true },
      });
      if (winningCreation) {
        let outputs: Record<string, unknown> = {};
        try {
          if (winningCreation.outputs && typeof winningCreation.outputs === 'object') {
            outputs = winningCreation.outputs as Record<string, unknown>;
          }
        } catch { /* empty outputs */ }
        const { outputs: updatedOutputs, changed } = applyWinnerTag(outputs, jobId);
        if (changed) {
          await prisma.creation.update({
            where: { id: winnerId },
            data: { outputs: JSON.parse(JSON.stringify(updatedOutputs)) },
          });
        }
      }
    } catch {
      // Tagging is best-effort — don't fail the job check
    }
  }

  return NextResponse.json({
    job,
    summary: summarizeJob(job),
  });
}

export const PATCH = withAtlas(__byokPATCH);
