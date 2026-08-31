import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_TREND_ADAPTER_CREDIT_COST,
  adaptToTrends,
  validateCreativeTrendAdapterInput,
  VALID_PLATFORMS,
  VALID_TREND_CATEGORIES,
  VALID_RISK_LEVELS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeTrendAdapterInput,
} from '@/lib/creative/creative-trend-adapter';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-trend-adapter
 * Returns the credit cost, schema info, and supported platforms/categories/risk
 * levels (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-trend-adapter',
    creditCost: CREATIVE_TREND_ADAPTER_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        trendCategory: 'string (optional: viral, seasonal, cultural, industry, aesthetic)',
        dryRun: 'boolean (optional)',
      },
      output: {
        adaptation: {
          adaptedContent: 'string',
          identifiedTrends: 'string[]',
          trendRelevance: 'number (1-10)',
          timingAdvice: 'string',
          suggestedHashtags: 'string[]',
          riskOfDatedness: 'low|medium|high',
          longevityScore: 'number (1-10)',
          recommendations: 'string[]',
        },
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      trendCategories: VALID_TREND_CATEGORIES,
      riskLevels: VALID_RISK_LEVELS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const trendCategory =
    typeof body.trendCategory === 'string' && VALID_TREND_CATEGORIES.includes(body.trendCategory)
      ? body.trendCategory
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeTrendAdapterInput = {
    content,
    productOrBrand,
    platform,
    trendCategory,
    dryRun,
  };

  const validation = validateCreativeTrendAdapterInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_TREND_ADAPTER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-trend-adapter');
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
    const result = await adaptToTrends(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-trend-adapter').catch(() => {});
    const safe = safeError(e, 'creative/creative-trend-adapter', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
