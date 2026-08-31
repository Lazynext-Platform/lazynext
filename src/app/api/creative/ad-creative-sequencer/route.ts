import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_SEQUENCER_CREDIT_COST,
  generateCreativeSequence,
  validateAdCreativeSequencerInput,
  VALID_PLATFORMS,
  VALID_CAMPAIGN_GOALS,
  MAX_PRODUCT_LENGTH,
  MIN_CREATIVE_COUNT,
  MAX_CREATIVE_COUNT,
  DEFAULT_CREATIVE_COUNT,
  type AdCreativeSequencerInput,
  type CampaignGoal,
} from '@/lib/creative/ad-creative-sequencer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-sequencer
 * Returns the credit cost, schema info, and supported platforms/goals (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-sequencer',
    creditCost: AD_CREATIVE_SEQUENCER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        campaignGoal: 'string (required: awareness, engagement, conversions, traffic, app_installs)',
        creativeCount: `number (optional, ${MIN_CREATIVE_COUNT}-${MAX_CREATIVE_COUNT}, default ${DEFAULT_CREATIVE_COUNT})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        sequence: 'CreativeSequence',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      campaignGoals: VALID_CAMPAIGN_GOALS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const campaignGoal =
    typeof body.campaignGoal === 'string' && VALID_CAMPAIGN_GOALS.includes(body.campaignGoal as CampaignGoal)
      ? (body.campaignGoal as CampaignGoal)
      : '';

  const creativeCount =
    typeof body.creativeCount === 'number' && Number.isFinite(body.creativeCount)
      ? Math.max(MIN_CREATIVE_COUNT, Math.min(MAX_CREATIVE_COUNT, Math.round(body.creativeCount)))
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeSequencerInput = {
    productOrBrand,
    campaignGoal: campaignGoal as CampaignGoal,
    creativeCount,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeSequencerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_SEQUENCER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-sequencer');
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'INSUFFICIENT_CREDITS'
            ? 'insufficient_credits'
            : 'charge_failed',
      },
      { status: 402 },
    );
  }

  try {
    const result = await generateCreativeSequence(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-sequencer').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-sequencer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
