import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { generateVariants, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import type { CreativeBrief, ScriptCandidate } from '@/lib/creative/types';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
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
  const count = typeof body.count === 'number' ? Math.min(Math.max(body.count, 1), 5) : 3;

  try {
    await deductCredits(uid, CREATIVE_COSTS.variants, 'creative:variants');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const variants = await generateVariants(brief, script, count, planTier);
    return NextResponse.json({ variants });
  } catch (e) {
    await refundSync(uid, CREATIVE_COSTS.variants, 'creative:variants');
    console.error('[creative/variants] error:', String(e));
    return NextResponse.json({ error: 'variants_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
