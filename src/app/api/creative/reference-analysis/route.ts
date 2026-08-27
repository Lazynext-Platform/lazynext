import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { analyzeReferenceCreative, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { atlasASR, ATLAS_ASR_MODEL } from '@/lib/providers/atlas-audio';
import { pollOnce } from '@/lib/atlas';

export const maxDuration = 90;

// Cost for ASR transcription (separate from analysis cost).
const ASR_COST = 2;

// Poll for ASR task completion (max ~60s, 5s intervals).
async function transcribeVideo(videoUrl: string, language?: string): Promise<string> {
  const task = await atlasASR.transcribe({
    model: ATLAS_ASR_MODEL,
    url: videoUrl,
    language,
  });
  // Poll up to 12 times (60s total)
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await pollOnce(task.getUrl);
    if (r.status === 'completed') {
    // ASR output is the transcript text (first output entry)
    return r.outputs[0] || '';
    }
    if (r.status === 'failed') throw new Error('asr_failed');
  }
  throw new Error('asr_timeout');
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim().slice(0, 10000) : undefined;
  const language = typeof body.language === 'string' ? body.language.trim().slice(0, 10) : undefined;
  const autoTranscribe = body.autoTranscribe !== false; // default true
  if (!sourceUrl) return NextResponse.json({ error: 'source_url_required' }, { status: 400 });

  // Determine total cost: analysis + optional ASR
  const needsTranscription = !transcript && autoTranscribe;
  const totalCost = CREATIVE_COSTS.referenceAnalysis + (needsTranscription ? ASR_COST : 0);

  try {
    await deductCredits(uid, totalCost, 'creative:reference-analysis');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    // If no transcript provided and auto-transcribe is enabled, transcribe the video audio
    let effectiveTranscript = transcript;
    if (needsTranscription) {
      try {
        effectiveTranscript = await transcribeVideo(sourceUrl, language);
      } catch (e) {
        // If ASR fails, continue with no transcript — analysis can still work from the URL
        console.error('[creative/reference-analysis] ASR failed, continuing without transcript:', String(e));
      }
    }

    const analysis = await analyzeReferenceCreative(sourceUrl, effectiveTranscript);
    return NextResponse.json({ analysis, transcript: effectiveTranscript || undefined });
  } catch (e) {
    await refundSync(uid, totalCost, 'creative:reference-analysis');
    console.error('[creative/reference-analysis] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
