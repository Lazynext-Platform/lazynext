import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { analyzeReferenceDeep, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import { deductCredits, refundCredits } from '@/lib/credits';
import { atlasASR, ATLAS_ASR_MODEL } from '@/lib/providers/atlas-audio';
import { pollOnce } from '@/lib/atlas';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 120;

const ASR_COST = 2;

async function transcribeVideo(videoUrl: string, language?: string): Promise<string> {
  const task = await atlasASR.transcribe({
    model: ATLAS_ASR_MODEL,
    url: videoUrl,
    language,
  });
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await pollOnce(task.getUrl);
    if (r.status === 'completed') return r.outputs[0] || '';
    if (r.status === 'failed') throw new Error('asr_failed');
  }
  throw new Error('asr_timeout');
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim().slice(0, 10000) : undefined;
  const language = typeof body.language === 'string' ? body.language.trim().slice(0, 10) : undefined;
  const autoTranscribe = body.autoTranscribe !== false;

  if (!sourceUrl) return NextResponse.json({ error: 'source_url_required' }, { status: 400 });

  const needsTranscription = !transcript && autoTranscribe;
  const totalCost = CREATIVE_COSTS.deepReferenceAnalysis + (needsTranscription ? ASR_COST : 0);

  try {
    await deductCredits(uid, totalCost, 'creative:deep-reference-analysis');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    let effectiveTranscript = transcript;
    if (needsTranscription) {
      try {
        effectiveTranscript = await transcribeVideo(sourceUrl, language);
      } catch (e) {
        console.error('[creative/reference-analysis/deep] ASR failed:', String(e));
      }
    }

    const analysis = await analyzeReferenceDeep(sourceUrl, effectiveTranscript, planTier);
    return NextResponse.json({ analysis, transcript: effectiveTranscript || undefined });
  } catch (e) {
    await refundCredits(uid, totalCost, 'creative:deep-reference-analysis');
    console.error('[creative/reference-analysis/deep] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
