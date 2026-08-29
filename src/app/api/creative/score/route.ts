import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { scoreCreative, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import type { CreativeBrief, ScriptCandidate, StoryboardCandidate } from '@/lib/creative/types';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  const script = body.script as ScriptCandidate | undefined;
  if (!brief || !script) {
    return NextResponse.json({ error: 'brief_script_required' }, { status: 400 });
  }
  const storyboard = body.storyboard as StoryboardCandidate | undefined;

  try {
    await deductCredits(uid, CREATIVE_COSTS.score, 'creative:score');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const score = await scoreCreative({ brief, script, storyboard: storyboard || null, planTier });
    return NextResponse.json({ score });
  } catch (e) {
    await refundCredits(uid, CREATIVE_COSTS.score, 'creative:score');
    console.error('[creative/score] error:', String(e));
    return NextResponse.json({ error: 'score_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
