import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { generateStoryboard, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import type { CreativeBrief, ScriptCandidate } from '@/lib/creative/types';
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
  const ratio = typeof body.ratio === 'string' ? body.ratio : '9:16';

  try {
    await deductCredits(uid, CREATIVE_COSTS.storyboard, 'creative:storyboard');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const storyboard = await generateStoryboard(brief, script, ratio, planTier);
    return NextResponse.json({ storyboard });
  } catch (e) {
    await refundCredits(uid, CREATIVE_COSTS.storyboard, 'creative:storyboard');
    console.error('[creative/storyboard] error:', String(e));
    return NextResponse.json({ error: 'storyboard_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
