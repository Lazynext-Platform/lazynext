import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { generateScript, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import type { CreativeBrief, CreativeAngle, HookCandidate } from '@/lib/creative/types';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  const angle = body.angle as CreativeAngle | undefined;
  const hook = body.hook as HookCandidate | undefined;
  if (!brief || !angle || !hook) {
    return NextResponse.json({ error: 'brief_angle_hook_required' }, { status: 400 });
  }

  try {
    await deductCredits(uid, CREATIVE_COSTS.script, 'creative:script');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const script = await generateScript(brief, angle, hook);
    return NextResponse.json({ script });
  } catch (e) {
    await refundSync(uid, CREATIVE_COSTS.script, 'creative:script');
    console.error('[creative/script] error:', String(e));
    return NextResponse.json({ error: 'script_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
