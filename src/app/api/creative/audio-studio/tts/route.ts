import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import {
  generateVoiceover,
  TTS_CREDIT_COST,
  type TTSRequest,
} from '@/lib/creative/audio-studio';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) {
    return NextResponse.json({ error: 'text_required' }, { status: 400 });
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: 'text_too_long', detail: 'Max 5000 characters' }, { status: 400 });
  }

  const request: TTSRequest = {
    text,
    voiceId: typeof body.voiceId === 'string' ? body.voiceId : undefined,
    gender: body.gender,
    tone: body.tone,
    language: body.language,
    pitch: body.pitch,
    speed: body.speed,
    format: body.format,
  };

  try {
    await deductCredits(uid, TTS_CREDIT_COST, 'audio:tts');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await generateVoiceover(request, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, TTS_CREDIT_COST, 'audio:tts');
    console.error('[audio-studio/tts] error:', String(e));
    return NextResponse.json({ error: 'tts_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
