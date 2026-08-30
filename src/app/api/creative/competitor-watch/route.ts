import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  watchCompetitor,
  validateCompetitorWatchInput,
  COMPETITOR_WATCH_CREDIT_COST,
  type CompetitorWatchInput,
} from '@/lib/creative/competitor-watch';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 90;

/**
 * GET /api/creative/competitor-watch
 * Returns credit cost and schema info for the competitor watch pipeline.
 */
export async function GET() {
  return NextResponse.json({
    feature: 'competitor-watch',
    creditCost: COMPETITOR_WATCH_CREDIT_COST,
    schema: {
      input: {
        competitorUrl: 'string (required)',
        adUrl: 'string (optional)',
        brandKit: 'string (optional)',
        brandPositioning: 'string (optional)',
        productCategory: 'string (optional)',
        platform: 'string (optional)',
      },
      output: {
        competitorUrl: 'string',
        analysisReport: 'string',
        creativeExtraction: 'CreativeExtraction',
        brandComparison: 'string',
        competitiveGaps: 'CompetitiveGap[]',
        counterStrategies: 'CounterStrategy[]',
        alerts: 'CompetitorAlert[]',
        processingNotes: 'string',
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

  const competitorUrl = typeof body.competitorUrl === 'string' ? body.competitorUrl.trim().slice(0, 2048) : '';
  if (!competitorUrl) return NextResponse.json({ error: 'competitor_url_required' }, { status: 400 });

  const input: CompetitorWatchInput = {
    competitorUrl,
    adUrl: typeof body.adUrl === 'string' ? body.adUrl.trim().slice(0, 2048) : undefined,
    brandKit: typeof body.brandKit === 'string' ? body.brandKit.trim().slice(0, 2000) : undefined,
    brandPositioning: typeof body.brandPositioning === 'string' ? body.brandPositioning.trim().slice(0, 1000) : undefined,
    productCategory: typeof body.productCategory === 'string' ? body.productCategory.trim().slice(0, 200) : undefined,
    platform: typeof body.platform === 'string' ? body.platform.trim().slice(0, 100) : undefined,
  };

  // Server-side validation
  const validation = validateCompetitorWatchInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = COMPETITOR_WATCH_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:competitor-watch');
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
      },
      { status: 402 },
    );
  }

  try {
    const result = await watchCompetitor(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:competitor-watch');
    const safe = safeError(e, 'creative/competitor-watch', 'watch_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
