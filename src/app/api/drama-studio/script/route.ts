import { withAtlas } from '@/lib/request-context';
import { refundCredits } from '@/lib/credits';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getDramaScriptModel, draftScript } from '@/lib/drama/prompt';
import { chargeSync, chargeErrorResponse } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 120;

// Long script text is more expensive than single-shot plan generation, priced separately.
const DRAMA_SCRIPT_COST = 5;

// Drama long script: requires login + charges DRAMA_SCRIPT_COST; only returns real AI script.
// On LLM failure refunds and returns error, avoiding mistaking local fallback script as AI output to continue production.
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 2000) : '';
  const style = typeof body.style === 'string' ? body.style : 'epic';
  const lang = typeof body.lang === 'string' ? body.lang : '中文';
  // Shot count defaults to AI deciding based on story pacing (4-6 segments); when frontend explicitly passes segments it's treated as an "exact segment count" requirement.
  const targetSegments = body.segments ? Math.max(2, Math.min(8, Number(body.segments))) : undefined;
  if (!topic) return NextResponse.json({ error: 'topic_required' }, { status: 400 });

  try {
    await chargeSync(uid, DRAMA_SCRIPT_COST, 'drama:script');
  } catch (e) {
    return chargeErrorResponse(e, 'drama/script');
  }

  const input = { topic, style, lang, targetSegments };
  try {
    const script = await draftScript(input);
    return NextResponse.json({ script, model: getDramaScriptModel(planTier) });
  } catch (e) {
    await refundCredits(uid, DRAMA_SCRIPT_COST, 'drama:script');
    const rawError = String(e);
    console.error('[drama/script] atlas error:', rawError);
    const status = rawError.toLowerCase().includes('timed out') ? 504 : 502;
    return NextResponse.json({ error: status === 504 ? 'script_timeout_refunded' : 'script_failed_refunded', refunded: true }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
