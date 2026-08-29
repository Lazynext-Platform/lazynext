import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  orchestrateCampaign,
  validateCampaignRequest,
  CAMPAIGN_ORCHESTRATOR_COST,
  type CampaignGoal,
  type CampaignState,
} from '@/lib/creative/campaign-orchestrator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

const VALID_GOALS: CampaignGoal[] = [
  'brand_awareness', 'product_launch', 'sales_boost', 'retargeting',
  'market_expansion', 'customer_acquisition', 'engagement', 'seasonal_promotion',
];

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const campaignName = typeof body.campaignName === 'string' ? body.campaignName.slice(0, 200) : '';
  const goal = typeof body.goal === 'string' && VALID_GOALS.includes(body.goal as CampaignGoal) ? body.goal as CampaignGoal : undefined;
  const productDescription = typeof body.productDescription === 'string' ? body.productDescription.slice(0, 5000) : '';
  const targetMarket = typeof body.targetMarket === 'string' ? body.targetMarket.slice(0, 500) : undefined;
  const budget = typeof body.budget === 'number' ? Math.min(Math.max(body.budget, 100), 1000000) : undefined;
  const platforms: string[] | undefined = Array.isArray(body.platforms) ? body.platforms.filter((p: unknown) => typeof p === 'string').map(String).slice(0, 5) : undefined;
  const autonomyLevel = typeof body.autonomyLevel === 'string' && ['manual', 'semi_autonomous', 'fully_autonomous'].includes(body.autonomyLevel) ? body.autonomyLevel as 'manual' | 'semi_autonomous' | 'fully_autonomous' : undefined;
  const existingState = body.existingState as CampaignState | undefined;

  const validation = validateCampaignRequest({ campaignName, goal });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, CAMPAIGN_ORCHESTRATOR_COST, 'creative:campaign-orchestrator');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await orchestrateCampaign({
      campaignName,
      goal: goal!,
      productDescription,
      targetMarket,
      budget,
      platforms,
      autonomyLevel,
      existingState,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, CAMPAIGN_ORCHESTRATOR_COST, 'creative:campaign-orchestrator');
    console.error('[creative/campaign-orchestrator] error:', String(e));
    return NextResponse.json({ error: 'orchestration_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
