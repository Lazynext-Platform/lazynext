import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import {
  selectMusic,
  MUSIC_CREDIT_COST,
  type MusicSelectionRequest,
  type MusicMood,
} from '@/lib/creative/audio-studio';

export const maxDuration = 30;

const VALID_MOODS: ReadonlySet<string> = new Set([
  'upbeat', 'energetic', 'calm', 'dramatic', 'inspirational',
  'corporate', 'playful', 'tense', 'sad', 'luxurious',
]);

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const mood = typeof body.mood === 'string' ? body.mood : '';
  if (!mood || !VALID_MOODS.has(mood)) {
    return NextResponse.json({ error: 'mood_required', detail: 'Valid mood required' }, { status: 400 });
  }

  const request: MusicSelectionRequest = {
    mood: mood as MusicMood,
    durationSec: typeof body.durationSec === 'number' ? body.durationSec : undefined,
    bpmRange:
      body.bpmRange && typeof body.bpmRange === 'object'
        ? { min: Number(body.bpmRange.min), max: Number(body.bpmRange.max) }
        : undefined,
    genre: typeof body.genre === 'string' ? body.genre : undefined,
  };

  try {
    await deductCredits(uid, MUSIC_CREDIT_COST, 'audio:music');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const tracks = await selectMusic(request);
    return NextResponse.json({ tracks });
  } catch (e) {
    await refundCredits(uid, MUSIC_CREDIT_COST, 'audio:music');
    console.error('[audio-studio/music] error:', String(e));
    return NextResponse.json({ error: 'music_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
