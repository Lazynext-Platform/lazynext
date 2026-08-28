import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { refineCreative, CREATIVE_COSTS, type RefineTargetType } from '@/lib/creative/intelligence';
import type { CreativeBrief } from '@/lib/creative/types';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  if (!brief || !brief.product) return NextResponse.json({ error: 'brief_required' }, { status: 400 });

  const type = body.type as RefineTargetType | undefined;
  if (!type || !['brief', 'hook', 'angle', 'script'].includes(type)) {
    return NextResponse.json({ error: 'invalid_type', detail: 'type must be brief, hook, angle, or script' }, { status: 400 });
  }

  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) return NextResponse.json({ error: 'instruction_required' }, { status: 400 });
  if (instruction.length > 1000) return NextResponse.json({ error: 'instruction_too_long' }, { status: 400 });

  const element = body.element;
  if (!element || typeof element !== 'object') return NextResponse.json({ error: 'element_required' }, { status: 400 });

  try {
    await deductCredits(uid, CREATIVE_COSTS.refine, 'creative:refine');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await refineCreative({ type, instruction, brief, element });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, CREATIVE_COSTS.refine, 'creative:refine');
    console.error('[creative/refine] error:', String(e));
    return NextResponse.json({ error: 'refine_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
