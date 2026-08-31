import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_PERFORMANCE_FORECASTER_CREDIT_COST,
  generatePerformanceForecast,
  validateCreativePerformanceForecasterInput,
  VALID_PLATFORMS,
  VALID_CAMPAIGN_GOALS,
  VALID_BUDGET_TIERS,
  VALID_GRADES,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativePerformanceForecasterInput,
  type CampaignGoal,
  type BudgetTier,
} from '@/lib/creative/creative-performance-forecaster';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-performance-forecaster
 * Returns the credit cost, schema info, and supported platforms/goals/budget
 * tiers/grades (no auth required for catalog metadata — same pattern as other
 * creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-performance-forecaster',
    creditCost: CREATIVE_PERFORMANCE_FORECASTER_CREDIT_COST,
    schema: {
      input: {
        creativeContent: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        campaignGoal: 'string (optional: awareness, engagement, conversions, traffic, app_installs)',
        budgetTier: 'string (optional: small, medium, large)',
        dryRun: 'boolean (optional)',
      },
      output: {
        forecast: 'PerformanceForecast',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      campaignGoals: VALID_CAMPAIGN_GOALS,
      budgetTiers: VALID_BUDGET_TIERS,
      grades: VALID_GRADES,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const creativeContent =
    typeof body.creativeContent === 'string' ? body.creativeContent.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const campaignGoal =
    typeof body.campaignGoal === 'string' && VALID_CAMPAIGN_GOALS.includes(body.campaignGoal as CampaignGoal)
      ? (body.campaignGoal as CampaignGoal)
      : undefined;

  const budgetTier =
    typeof body.budgetTier === 'string' && VALID_BUDGET_TIERS.includes(body.budgetTier as BudgetTier)
      ? (body.budgetTier as BudgetTier)
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativePerformanceForecasterInput = {
    creativeContent,
    productOrBrand,
    platform,
    campaignGoal,
    budgetTier,
    dryRun,
  };

  const validation = validateCreativePerformanceForecasterInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_PERFORMANCE_FORECASTER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-performance-forecaster');
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
    const result = await generatePerformanceForecast(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-performance-forecaster').catch(() => {});
    const safe = safeError(e, 'creative/creative-performance-forecaster', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
