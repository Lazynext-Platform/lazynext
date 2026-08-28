import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { analyzeBrief, BRIEF_INTELLIGENCE_COST, validateBriefRequest } from '@/lib/creative/brief-intelligence';
import type { BriefType } from '@/lib/creative/brief-intelligence';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const productName = typeof body.productName === 'string' ? body.productName.trim().slice(0, 200) : '';
  const validation = validateBriefRequest({ ...body, productName });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', details: validation.errors }, { status: 400 });
  }

  try {
    await deductCredits(uid, BRIEF_INTELLIGENCE_COST, 'creative:brief-intelligence');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  // Parse optional existing creatives (array of { creativeId, content }).
  const existingCreatives = Array.isArray(body.existingCreatives)
    ? body.existingCreatives
        .filter((c: unknown) => c && typeof c === 'object' && typeof (c as Record<string, unknown>).creativeId === 'string' && typeof (c as Record<string, unknown>).content === 'string')
        .map((c: Record<string, unknown>) => ({
          creativeId: String((c as Record<string, unknown>).creativeId).slice(0, 100),
          content: String((c as Record<string, unknown>).content).slice(0, 4000),
        }))
    : undefined;

  try {
    const result = await analyzeBrief({
      productName,
      productDescription: typeof body.productDescription === 'string' ? body.productDescription.trim().slice(0, 4000) : undefined,
      productUrl: typeof body.productUrl === 'string' ? body.productUrl.trim().slice(0, 500) : undefined,
      competitorInfo: typeof body.competitorInfo === 'string' ? body.competitorInfo.trim().slice(0, 4000) : undefined,
      briefType: typeof body.briefType === 'string' ? (body.briefType as BriefType) : undefined,
      existingCreatives: existingCreatives && existingCreatives.length ? existingCreatives : undefined,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, BRIEF_INTELLIGENCE_COST, 'creative:brief-intelligence');
    console.error('[creative/brief-intelligence] error:', String(e));
    return NextResponse.json({ error: 'brief_intelligence_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
