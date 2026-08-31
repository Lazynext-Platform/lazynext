import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_FORMAT_RECOMMENDER_CREDIT_COST,
  generateFormatRecommendation,
  validateCreativeFormatRecommenderInput,
  VALID_PLATFORMS,
  VALID_FORMATS,
  VALID_GOALS,
  DEFAULT_GOAL,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeFormatRecommenderInput,
} from '@/lib/creative/creative-format-recommender';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-format-recommender
 * Returns the credit cost, schema info, and supported platforms/formats/goals
 * (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-format-recommender',
    creditCost: CREATIVE_FORMAT_RECOMMENDER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        campaignGoal: `string (required: ${VALID_GOALS.join(', ')} — default ${DEFAULT_GOAL})`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        recommendation: 'FormatRecommenderPayload',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      formats: VALID_FORMATS,
      goals: VALID_GOALS,
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
    typeof body.campaignGoal === 'string' && VALID_GOALS.includes(body.campaignGoal.trim())
      ? body.campaignGoal.trim()
      : '';

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeFormatRecommenderInput = {
    productOrBrand,
    campaignGoal,
    targetAudience,
    platform,
    dryRun,
  };

  const validation = validateCreativeFormatRecommenderInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_FORMAT_RECOMMENDER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-format-recommender');
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
    const result = await generateFormatRecommendation(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-format-recommender').catch(() => {});
    const safe = safeError(e, 'creative/creative-format-recommender', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
