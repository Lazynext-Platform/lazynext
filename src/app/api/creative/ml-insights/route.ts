import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { analyzeCreativePerformance, ML_INSIGHTS_COST } from '@/lib/creative/ml-insights';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 120;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const creativeIds = Array.isArray(body.creativeIds) ? body.creativeIds.filter((id: unknown) => typeof id === 'string') : undefined;

  try {
    await deductCredits(uid, ML_INSIGHTS_COST, 'creative:ml-insights');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await analyzeCreativePerformance(creativeIds, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, ML_INSIGHTS_COST, 'creative:ml-insights');
    console.error('[creative/ml-insights] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
