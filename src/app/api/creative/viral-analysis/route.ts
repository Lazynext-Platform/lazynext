import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { analyzeVirality, VIRAL_ANALYSIS_COST } from '@/lib/creative/viral-analysis';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim().slice(0, 2048) : '';
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim().slice(0, 10000) : undefined;

  if (!sourceUrl) return NextResponse.json({ error: 'source_url_required' }, { status: 400 });

  // Validate URL format
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  const cost = VIRAL_ANALYSIS_COST;

  try {
    await deductCredits(uid, cost, 'creative:viral-analysis');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const analysis = await analyzeVirality(sourceUrl, transcript, planTier);
    return NextResponse.json({ analysis });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:viral-analysis');
    console.error('[creative/viral-analysis] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
