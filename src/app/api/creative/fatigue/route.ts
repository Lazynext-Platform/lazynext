import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { detectFatigue, FATIGUE_COST, type CreativeMetrics } from '@/lib/creative/fatigue-detector';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const creatives = Array.isArray(body.creatives) ? body.creatives as CreativeMetrics[] : [];
  if (creatives.length === 0) {
    return NextResponse.json({ error: 'invalid_request', detail: 'At least 1 creative is required' }, { status: 400 });
  }

  try {
    await deductCredits(uid, FATIGUE_COST, 'creative:fatigue');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await detectFatigue(creatives, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, FATIGUE_COST, 'creative:fatigue');
    console.error('[creative/fatigue] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
