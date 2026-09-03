import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { runCreativeDirector, type DirectorStep, type DirectorResult } from '@/lib/creative/director';
import { deductCredits, refundCredits } from '@/lib/credits';
import { dispatchWebhook } from '@/lib/webhooks';
import { isUrlSafe } from '@/lib/security';

export const maxDuration = 120;

const DIRECTOR_BUDGET_DEFAULT = 30;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const brandUrl = typeof body.brandUrl === 'string' && isUrlSafe(body.brandUrl) ? body.brandUrl : undefined;
  const productUrl = typeof body.productUrl === 'string' && isUrlSafe(body.productUrl) ? body.productUrl : undefined;
  const budget = typeof body.budgetCredits === 'number' ? Math.min(body.budgetCredits, 50) : DIRECTOR_BUDGET_DEFAULT;

  // Pre-charge the full budget; refund unused credits after
  try {
    await deductCredits(uid, budget, 'creative:director');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  // Check if client wants streaming (default: yes for newer clients)
  const url = new URL(req.url);
  const wantsStream = url.searchParams.get('stream') !== 'false';

  if (!wantsStream) {
    // Legacy non-streaming response
    try {
      const result = await runCreativeDirector({
        brandUrl,
        productUrl,
        productText: body.productText,
        productName: body.productName,
        platform: body.platform,
        format: body.format,
        budgetCredits: budget,
        requireStepApproval: false,
        userId: uid,
      });

      const unused = budget - result.totalCreditsSpent;
      if (unused > 0) await refundCredits(uid, unused, 'creative:director:refund');

      await dispatchWebhook(uid, 'creative.generated', { assetPackageId: result.assetPackageId, totalCreditsSpent: result.totalCreditsSpent }).catch(() => {});

      return NextResponse.json({ result });
    } catch (e) {
      await refundCredits(uid, budget, 'creative:director:failed');
      console.error('[creative/director] error:', String(e));
      return NextResponse.json({ error: 'director_failed' }, { status: 500 });
    }
  }

  // Streaming response: send step updates as SSE-style JSON lines
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify({ event, data }) + '\n'));
      };

      try {
        const result = await runCreativeDirector(
          {
            brandUrl,
            productUrl,
            productText: body.productText,
            productName: body.productName,
            platform: body.platform,
            format: body.format,
            budgetCredits: budget,
            requireStepApproval: false,
            userId: uid,
          },
          async (step: DirectorStep<unknown>, current: DirectorResult) => {
            // Send step update after each step transition
            send('step', {
              name: step.name,
              status: step.status,
              creditsSpent: step.creditsSpent,
              error: step.error,
              totalCreditsSpent: current.totalCreditsSpent,
              budgetCredits: current.budgetCredits,
            });
          },
        );

        // Refund unused credits
        const unused = budget - result.totalCreditsSpent;
        if (unused > 0) await refundCredits(uid, unused, 'creative:director:refund');

        await dispatchWebhook(uid, 'creative.generated', { assetPackageId: result.assetPackageId, totalCreditsSpent: result.totalCreditsSpent }).catch(() => {});

        // Send final result
        send('complete', {
          steps: result.steps,
          brief: result.brief,
          hooks: result.hooks,
          angles: result.angles,
          bestCombination: result.bestCombination,
          variants: result.variants,
          totalCreditsSpent: result.totalCreditsSpent,
          budgetCredits: result.budgetCredits,
          assetPackageId: result.assetPackageId,
        });
      } catch (e) {
        await refundCredits(uid, budget, 'creative:director:failed');
        console.error('[creative/director] stream error:', String(e));
        send('error', { error: 'director_failed' });
      } finally {
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

export const POST = withAtlas(__byokPOST);
