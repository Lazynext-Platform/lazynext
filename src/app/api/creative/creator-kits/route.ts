import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateCreatorKit,
  validateCreatorKitRequest,
  CREATOR_KIT_COST,
  type KitPlatform,
  type CampaignGoal,
} from '@/lib/creative/creator-kits';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const productName = typeof body.productName === 'string' ? body.productName.slice(0, 200) : '';
  const productDescription = typeof body.productDescription === 'string' ? body.productDescription.slice(0, 4000) : '';
  const platform = typeof body.platform === 'string' ? body.platform.slice(0, 50) : 'tiktok';
  const campaignGoal = typeof body.campaignGoal === 'string' ? body.campaignGoal.slice(0, 50) : 'awareness';
  const targetAudience = typeof body.targetAudience === 'string' ? body.targetAudience.slice(0, 500) : undefined;
  const keySellingPoints = typeof body.keySellingPoints === 'string' ? body.keySellingPoints.slice(0, 1000) : undefined;
  const brandGuidelines = typeof body.brandGuidelines === 'string' ? body.brandGuidelines.slice(0, 1000) : undefined;

  const validation = validateCreatorKitRequest({ productName, productDescription, platform, campaignGoal });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, CREATOR_KIT_COST, 'creative:creator-kits');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await generateCreatorKit({
      productName,
      productDescription,
      platform: platform as KitPlatform,
      campaignGoal: campaignGoal as CampaignGoal,
      targetAudience,
      keySellingPoints,
      brandGuidelines,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, CREATOR_KIT_COST, 'creative:creator-kits');
    console.error('[creative/creator-kits] error:', String(e));
    return NextResponse.json({ error: 'kit_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
