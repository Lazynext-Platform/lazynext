import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateAudienceInsights,
  validateAudienceInsightsRequest,
  AUDIENCE_INSIGHTS_COST,
} from '@/lib/creative/audience-insights';
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

  const productDescription = typeof body.productDescription === 'string' ? body.productDescription.slice(0, 5000) : '';
  const productCategory = typeof body.productCategory === 'string' ? body.productCategory.slice(0, 200) : undefined;
  const targetMarket = typeof body.targetMarket === 'string' ? body.targetMarket.slice(0, 500) : undefined;
  const existingCustomerData = typeof body.existingCustomerData === 'string' ? body.existingCustomerData.slice(0, 3000) : undefined;
  const competitorAudience = typeof body.competitorAudience === 'string' ? body.competitorAudience.slice(0, 2000) : undefined;

  const validation = validateAudienceInsightsRequest({ productDescription });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, AUDIENCE_INSIGHTS_COST, 'creative:audience-insights');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await generateAudienceInsights({
      productDescription,
      productCategory,
      targetMarket,
      existingCustomerData,
      competitorAudience,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, AUDIENCE_INSIGHTS_COST, 'creative:audience-insights');
    console.error('[creative/audience-insights] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
