import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { runCreativeDirector } from '@/lib/creative/director';
import { metaAds } from '@/lib/ad-platforms/meta';
import { googleAds } from '@/lib/ad-platforms/google';
import type { AdCampaignInput, PublishOptions } from '@/lib/ad-platforms/types';
import { deductCredits, refundCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';
import { dispatchWebhook } from '@/lib/webhooks';

export const maxDuration = 120;

/**
 * POST /api/creative/autonomous-pipeline
 *
 * Fully autonomous end-to-end creative production:
 * 1. Run the Creative Director (brand → brief → hooks → angles → script → score → storyboard → variants)
 * 2. Pick the best-scoring variant
 * 3. Auto-deploy to the specified ad platform as a campaign
 *
 * Body:
 *   - brandUrl?: string
 *   - productUrl?: string
 *   - productText?: string
 *   - productName?: string
 *   - platform: 'tiktok' | 'instagram' | 'youtube' (creative platform)
 *   - format?: string
 *   - budgetCredits?: number (default 30, max 50)
 *   - deployPlatform: 'meta' | 'google' (ad platform)
 *   - deployDryRun?: boolean (default true for safety)
 *   - deployBudgetDaily?: number
 *   - deployBudgetTotal?: number
 *   - deployCurrency?: string
 *   - deployTargeting?: object
 *   - deploySpendCap?: number
 *
 * Returns an NDJSON stream of step updates, followed by the final result.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const budget = typeof body.budgetCredits === 'number' ? Math.min(body.budgetCredits, 50) : 30;
  const deployPlatform = String(body.deployPlatform || 'meta');
  if (!['meta', 'google'].includes(deployPlatform)) {
    return NextResponse.json({ error: 'invalid_deploy_platform' }, { status: 400 });
  }

  // Pre-charge the director budget
  try {
    await deductCredits(uid, budget, 'creative:autonomous');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify({ event, data }) + '\n'));
      };

      try {
        send('pipeline_start', {
          budgetCredits: budget,
          deployPlatform,
          deployDryRun: body.deployDryRun !== false,
        });

        // Phase 1: Run the Creative Director
        send('phase', { phase: 'creative_director', status: 'running' });

        const directorResult = await runCreativeDirector(
          {
            brandUrl: body.brandUrl,
            productUrl: body.productUrl,
            productText: body.productText,
            productName: body.productName,
            platform: body.platform,
            format: body.format,
            budgetCredits: budget,
            requireStepApproval: false,
            userId: uid,
          },
          (step, result) => {
            send('director_step', {
              name: step.name,
              status: step.status,
              creditsSpent: step.creditsSpent,
              error: step.error,
              totalSpent: result.totalCreditsSpent,
            });
            return Promise.resolve();
          },
        );

        send('phase', { phase: 'creative_director', status: 'completed', totalCreditsSpent: directorResult.totalCreditsSpent });

        // Check if we have a best combination
        if (!directorResult.bestCombination) {
          send('error', { message: 'No best combination produced by the director' });
          const unused = budget - directorResult.totalCreditsSpent;
          if (unused > 0) await refundCredits(uid, unused, 'creative:autonomous:refund');
          controller.close();
          return;
        }

        // Phase 2: Deploy to ad platform
        send('phase', { phase: 'deploy', status: 'running', platform: deployPlatform });

        const best = directorResult.bestCombination;
        const campaignName = `${body.productName || 'Product'} — Auto-Deployed (${new Date().toISOString().slice(0, 10)})`;

        const opts: PublishOptions = {
          dryRun: body.deployDryRun !== false, // default to dry-run for safety
          requireApproval: false, // autonomous mode skips approval
          spendCap: typeof body.deploySpendCap === 'number' ? body.deploySpendCap : undefined,
        };

        const provider = deployPlatform === 'meta' ? metaAds : googleAds;
        const input: AdCampaignInput = {
          platform: deployPlatform as 'meta' | 'google',
          name: campaignName,
          creativeIds: [best.script.id || `auto-${Date.now()}`],
          budgetDaily: body.deployBudgetDaily,
          budgetTotal: body.deployBudgetTotal,
          currency: body.deployCurrency || 'USD',
          targeting: body.deployTargeting,
        };

        try {
          const deployResult = await provider.createCampaign(input, opts);

          // Persist to DB
          const campaign = await prisma.adCampaign.create({
            data: {
              userId: uid,
              platform: deployPlatform,
              campaignId: deployResult.campaignId || null,
              name: campaignName,
              status: deployResult.status,
              budgetDaily: input.budgetDaily || null,
              budgetTotal: input.budgetTotal || null,
              currency: input.currency || 'USD',
              targeting: input.targeting ? JSON.parse(JSON.stringify(input.targeting)) : undefined,
              creativeIds: input.creativeIds,
              metrics: deployResult.metrics ? JSON.parse(JSON.stringify(deployResult.metrics)) : undefined,
            },
          }).catch(() => null);

          send('phase', {
            phase: 'deploy',
            status: 'completed',
            campaignId: deployResult.campaignId,
            campaignName,
            dryRun: opts.dryRun,
            dbId: campaign?.id || null,
          });

          send('pipeline_complete', {
            directorResult: {
              bestScore: best.score.overall,
              hookType: best.hook.type,
              angleName: best.angle.name,
              scriptTitle: best.script.title,
              totalCreditsSpent: directorResult.totalCreditsSpent,
              assetPackageId: directorResult.assetPackageId,
            },
            deployResult: {
              campaignId: deployResult.campaignId,
              campaignName,
              status: deployResult.status,
              dryRun: opts.dryRun,
              dbId: campaign?.id || null,
            },
          });
        } catch (deployErr) {
          const deployErrorRaw = deployErr instanceof Error ? deployErr.message : String(deployErr);
          console.error('[autonomous-pipeline] deploy error:', deployErrorRaw);
          send('phase', { phase: 'deploy', status: 'failed', error: 'deploy_failed' });
          send('pipeline_complete', {
            directorResult: {
              bestScore: best.score.overall,
              hookType: best.hook.type,
              angleName: best.angle.name,
              scriptTitle: best.script.title,
              totalCreditsSpent: directorResult.totalCreditsSpent,
              assetPackageId: directorResult.assetPackageId,
            },
            deployResult: null,
            deployError: 'deploy_failed',
          });
        }

        // Refund unused credits
        const unused = budget - directorResult.totalCreditsSpent;
        if (unused > 0) await refundCredits(uid, unused, 'creative:autonomous:refund');

        await dispatchWebhook(uid, 'pipeline.completed', { bestScore: best.score.overall, dryRun: opts.dryRun }).catch(() => {});

        controller.close();
      } catch (e) {
        const rawError = e instanceof Error ? e.message : String(e);
        console.error('[autonomous-pipeline] error:', rawError);
        send('error', { message: 'pipeline_failed' });
        await refundCredits(uid, budget, 'creative:autonomous:failed');
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export { __byokPOST as POST };
