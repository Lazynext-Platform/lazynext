import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { atlasASR, ATLAS_ASR_MODEL } from '@/lib/providers/atlas-audio';
import { pollOnce } from '@/lib/atlas';
import { deductCredits, refundCredits } from '@/lib/credits';
import type { ASRResult } from '@/lib/providers/types';

export const maxDuration = 90;

const ASR_COST = 2;

/**
 * Poll for ASR task completion (max ~60s, 5s intervals).
 * Returns the raw transcript text from the first output entry.
 */
async function pollASR(task: { getUrl: string }): Promise<string> {
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await pollOnce(task.getUrl);
    if (r.status === 'completed') {
      return r.outputs[0] || '';
    }
    if (r.status === 'failed') throw new Error('asr_failed');
  }
  throw new Error('asr_timeout');
}

/**
 * Parse raw transcript text into segments.
 * Atlas ASR returns plain text; we split on sentence boundaries
 * and assign approximate timestamps based on word count.
 */
function parseTranscript(text: string, estimatedDurationSec?: number): ASRResult {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length === 0) {
    return { text, segments: [], duration: estimatedDurationSec };
  }

  // Estimate duration from word count if not provided (avg 2.5 words/sec)
  const totalWords = text.trim().split(/\s+/).length;
  const duration = estimatedDurationSec ?? Math.max(totalWords / 2.5, sentences.length * 2);

  // Distribute time proportionally by word count per sentence
  const segments = sentences.map((sentence, i) => {
    const words = sentence.split(/\s+/).length;
    const wordRatio = words / totalWords;
    const segDuration = wordRatio * duration;
    const start = i === 0
      ? 0
      : sentences.slice(0, i).reduce((sum, s) => sum + (s.split(/\s+/).length / totalWords) * duration, 0);
    return {
      start: Math.round(start * 10) / 10,
      end: Math.round((start + segDuration) * 10) / 10,
      text: sentence,
    };
  });

  return { text, segments, duration: Math.round(duration * 10) / 10 };
}

/**
 * POST /api/editor/transcribe
 * Body: { videoUrl: string, language?: string }
 * Returns an ASR transcript with segments suitable for the rough cut planner.
 * Cost: 2 credits.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
  if (!videoUrl) {
    return NextResponse.json({ error: 'videoUrl_required' }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(videoUrl);
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  const language = typeof body.language === 'string' ? body.language : undefined;

  try {
    await deductCredits(uid, ASR_COST, 'editor:transcribe');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const task = await atlasASR.transcribe({
      model: ATLAS_ASR_MODEL,
      url: videoUrl,
      language,
    });

    const rawText = await pollASR(task);
    const transcript = parseTranscript(rawText, body.estimatedDurationSec);

    return NextResponse.json({
      transcript,
      model: ATLAS_ASR_MODEL,
      cost: ASR_COST,
    });
  } catch (e) {
    await refundCredits(uid, ASR_COST, 'editor:transcribe');
    const message = e instanceof Error ? e.message : String(e);
    console.error('[editor/transcribe] error:', message);
    if (message === 'asr_timeout') {
      return NextResponse.json({ error: 'transcription_timeout', detail: 'ASR did not complete within 60 seconds' }, { status: 504 });
    }
    return NextResponse.json({ error: 'transcription_failed', detail: message }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
