import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  analyzeScenes,
  validateSceneAnalysisRequest,
  SCENE_ANALYSIS_COST,
} from '@/lib/creative/scene-analysis';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const sourceContent = typeof body.sourceContent === 'string' ? body.sourceContent.slice(0, 10000) : '';
  const sourceType = typeof body.sourceType === 'string' ? body.sourceType.slice(0, 50) : undefined;
  const targetPlatform = typeof body.targetPlatform === 'string' ? body.targetPlatform.slice(0, 50) : undefined;
  const adaptationGoal = typeof body.adaptationGoal === 'string' ? body.adaptationGoal.slice(0, 500) : undefined;

  const validation = validateSceneAnalysisRequest({ sourceContent });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, SCENE_ANALYSIS_COST, 'creative:scene-analysis');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await analyzeScenes({
      sourceContent,
      sourceType: sourceType as 'transcript' | 'description' | 'script' | undefined,
      targetPlatform,
      adaptationGoal,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, SCENE_ANALYSIS_COST, 'creative:scene-analysis');
    console.error('[creative/scene-analysis] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
