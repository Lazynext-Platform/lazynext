import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import {
  mixAudio,
  isUrlSafe,
  MIX_CREDIT_COST,
  type AudioMixRequest,
} from '@/lib/creative/audio-studio';

export const maxDuration = 120;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const voiceoverUrl = typeof body.voiceoverUrl === 'string' ? body.voiceoverUrl.trim().slice(0, 2048) : '';  if (!voiceoverUrl) {
    return NextResponse.json({ error: 'voiceover_url_required' }, { status: 400 });
  }
  if (!isUrlSafe(voiceoverUrl)) {
    return NextResponse.json({ error: 'voiceover_url_unsafe', detail: 'URL must be public http(s)' }, { status: 400 });
  }

  const musicUrl = typeof body.musicUrl === 'string' ? body.musicUrl.trim().slice(0, 2048) : '';
  if (musicUrl && !isUrlSafe(musicUrl)) {
    return NextResponse.json({ error: 'music_url_unsafe', detail: 'URL must be public http(s)' }, { status: 400 });
  }

  const musicVolume = typeof body.musicVolume === 'number' ? body.musicVolume : 50;
  const voiceVolume = typeof body.voiceVolume === 'number' ? body.voiceVolume : 100;
  if (musicVolume < 0 || musicVolume > 100 || voiceVolume < 0 || voiceVolume > 100) {
    return NextResponse.json({ error: 'volume_invalid', detail: 'Volumes must be 0-100' }, { status: 400 });
  }

  const request: AudioMixRequest = {
    voiceoverUrl,
    musicUrl: musicUrl || undefined,
    musicVolume,
    voiceVolume,
    fadeInSec: typeof body.fadeInSec === 'number' ? body.fadeInSec : undefined,
    fadeOutSec: typeof body.fadeOutSec === 'number' ? body.fadeOutSec : undefined,
    crossfadeSec: typeof body.crossfadeSec === 'number' ? body.crossfadeSec : undefined,
    outputFormat: body.outputFormat,
  };

  try {
    await deductCredits(uid, MIX_CREDIT_COST, 'audio:mix');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await mixAudio(request, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, MIX_CREDIT_COST, 'audio:mix');
    console.error('[audio-studio/mix] error:', String(e));
    return NextResponse.json({ error: 'mix_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
