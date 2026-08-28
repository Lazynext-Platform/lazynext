import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { generateAngles, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import type { CreativeBrief } from '@/lib/creative/types';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  if (!brief || !brief.product) return NextResponse.json({ error: 'brief_required' }, { status: 400 });

  const count = Math.max(1, Math.min(6, Number(body.count) || 3));

  try {
    await deductCredits(uid, CREATIVE_COSTS.angles, 'creative:angles');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const angles = await generateAngles(brief, count, planTier);
    return NextResponse.json({ angles });
  } catch (e) {
    await refundSync(uid, CREATIVE_COSTS.angles, 'creative:angles');
    console.error('[creative/angles] error:', String(e));
    return NextResponse.json({ error: 'angles_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
