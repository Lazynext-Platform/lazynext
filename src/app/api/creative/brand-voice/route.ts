import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { analyzeBrandVoice, BRAND_VOICE_COST, validateBrandVoiceRequest } from '@/lib/creative/brand-voice';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const validation = validateBrandVoiceRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, BRAND_VOICE_COST, 'creative:brand-voice');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await analyzeBrandVoice({
      brandName: body.brandName,
      brandDescription: body.brandDescription,
      brandGuidelines: body.brandGuidelines,
      sampleCreatives: body.sampleCreatives,
      creativesToCheck: body.creativesToCheck,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, BRAND_VOICE_COST, 'creative:brand-voice');
    console.error('[creative/brand-voice] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
