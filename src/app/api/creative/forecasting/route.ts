import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { generateForecast, FORECAST_COST, validateForecastRequest } from '@/lib/creative/forecasting';
import type { ForecastHorizon, ForecastMetric } from '@/lib/creative/forecasting';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const validation = validateForecastRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', details: validation.errors }, { status: 400 });
  }

  try {
    await deductCredits(uid, FORECAST_COST, 'creative:forecasting');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await generateForecast({
      creativeDescription: String(body.creativeDescription).slice(0, 4000),
      productName: typeof body.productName === 'string' ? String(body.productName).slice(0, 200) : undefined,
      targetAudience: typeof body.targetAudience === 'string' ? String(body.targetAudience).slice(0, 500) : undefined,
      platform: typeof body.platform === 'string' ? String(body.platform).slice(0, 50) : undefined,
      budget: typeof body.budget === 'number' ? body.budget : undefined,
      horizon: typeof body.horizon === 'string' ? (body.horizon as ForecastHorizon) : undefined,
      primaryMetric: typeof body.primaryMetric === 'string' ? (body.primaryMetric as ForecastMetric) : undefined,
      historicalData: Array.isArray(body.historicalData) ? body.historicalData : undefined,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, FORECAST_COST, 'creative:forecasting');
    console.error('[creative/forecasting] error:', String(e));
    return NextResponse.json({ error: 'forecast_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
