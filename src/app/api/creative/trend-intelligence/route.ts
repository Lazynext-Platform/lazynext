import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateTrendIntelligence,
  validateTrendIntelligenceRequest,
  TREND_INTELLIGENCE_COST,
  type TrendTimeframe,
} from '@/lib/creative/trend-intelligence';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

const VALID_TIMEFRAMES: TrendTimeframe[] = ['immediate', 'short_term', 'medium_term', 'long_term'];

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const productNiche = typeof body.productNiche === 'string' ? body.productNiche.slice(0, 500) : '';
  const productCategory = typeof body.productCategory === 'string' ? body.productCategory.slice(0, 200) : undefined;
  const targetAudience = typeof body.targetAudience === 'string' ? body.targetAudience.slice(0, 500) : undefined;
  const platforms: string[] | undefined = Array.isArray(body.platforms)
    ? body.platforms.filter((p: unknown) => typeof p === 'string').map(String).slice(0, 5)
    : undefined;

  let timeframe: TrendTimeframe | undefined;
  if (typeof body.timeframe === 'string' && VALID_TIMEFRAMES.includes(body.timeframe as TrendTimeframe)) {
    timeframe = body.timeframe as TrendTimeframe;
  }

  const validation = validateTrendIntelligenceRequest({ productNiche });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, TREND_INTELLIGENCE_COST, 'creative:trend-intelligence');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await generateTrendIntelligence({
      productNiche,
      productCategory,
      targetAudience,
      platforms,
      timeframe,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, TREND_INTELLIGENCE_COST, 'creative:trend-intelligence');
    console.error('[creative/trend-intelligence] error:', String(e));
    return NextResponse.json({ error: 'trend_analysis_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
