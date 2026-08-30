import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generatePerformanceLoop,
  validatePerformanceLoopInput,
  PERFORMANCE_LOOP_CREDIT_COST,
  type PerformanceLoopInput,
} from '@/lib/creative/performance-loop';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/performance-loop
 * Returns the credit cost and the input/output schema (no auth required for
 * catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: PERFORMANCE_LOOP_CREDIT_COST,
    schema: {
      input: {
        productName: 'string (required)',
        productUrl: 'string (optional)',
        audience: 'string (optional)',
        platform: 'string (optional)',
        dryRun: 'boolean (optional)',
      },
      output: {
        learnings: 'CreativeLearning[]',
        improvedBriefs: 'ImprovedBrief[]',
        summary: 'string',
        topPerformingPatterns: 'string[]',
        underperformingPatterns: 'string[]',
        recommendedNextSteps: 'string[]',
        generationPrompt: 'string',
      },
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const productName =
    typeof body.productName === 'string' ? body.productName.trim().slice(0, 2000) : '';
  if (!productName) {
    return NextResponse.json({ error: 'product_name_required' }, { status: 400 });
  }

  const productUrl =
    typeof body.productUrl === 'string' && body.productUrl.trim()
      ? body.productUrl.trim().slice(0, 2048)
      : undefined;

  const audience =
    typeof body.audience === 'string' ? body.audience.trim().slice(0, 1000) : undefined;
  const platform =
    typeof body.platform === 'string' ? body.platform.trim().slice(0, 100) : undefined;

  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: PerformanceLoopInput = {
    productName,
    productUrl,
    audience,
    platform,
    dryRun,
  };

  // Server-side validation (catches URL/shape issues).
  const validation = validatePerformanceLoopInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, PERFORMANCE_LOOP_CREDIT_COST, 'creative:performance-loop');
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'INSUFFICIENT_CREDITS'
            ? 'insufficient_credits'
            : 'charge_failed',
      },
      { status: 402 },
    );
  }

  try {
    const result = await generatePerformanceLoop(input, uid, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, PERFORMANCE_LOOP_CREDIT_COST, 'creative:performance-loop');
    return NextResponse.json(safeError(e, 'creative/performance-loop', 'performance_loop_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
