import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  processClipCommand,
  validateClipEditorRequest,
  CLIP_EDITOR_COST,
  type Clip,
} from '@/lib/creative/clip-editor';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const command = typeof body.command === 'string' ? body.command.slice(0, 500) : '';
  const clips = Array.isArray(body.clips) ? (body.clips as Clip[]).slice(0, 100) : [];
  const currentTimecode = typeof body.currentTimecode === 'number' ? body.currentTimecode : 0;

  const validation = validateClipEditorRequest({ command, clips });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, CLIP_EDITOR_COST, 'creative:clip-editor');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await processClipCommand({ command, clips, currentTimecode, planTier });
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, CLIP_EDITOR_COST, 'creative:clip-editor');
    console.error('[creative/clip-editor] error:', String(e));
    return NextResponse.json({ error: 'command_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
