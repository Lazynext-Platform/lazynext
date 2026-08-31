import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_COMPETITIVE_INTELLIGENCE_CREDIT_COST,
  generateCompetitiveIntelligence,
  validateAdCompetitiveIntelligenceInput,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_COMPETITORS_LENGTH,
  type AdCompetitiveIntelligenceInput,
} from '@/lib/creative/ad-competitive-intelligence';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-competitive-intelligence
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-competitive-intelligence',
    creditCost: AD_COMPETITIVE_INTELLIGENCE_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        category: `string (required, max ${MAX_CATEGORY_LENGTH} chars)`,
        competitors: `string (required, comma-separated, max ${MAX_COMPETITORS_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        intelligence: 'CompetitiveIntelligence',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
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

  const category =
    typeof body.category === 'string' ? body.category.trim().slice(0, MAX_CATEGORY_LENGTH) : '';

  const competitors =
    typeof body.competitors === 'string' ? body.competitors.trim().slice(0, MAX_COMPETITORS_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCompetitiveIntelligenceInput = {
    productOrBrand,
    category,
    competitors,
    platform,
    dryRun,
  };

  const validation = validateAdCompetitiveIntelligenceInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_COMPETITIVE_INTELLIGENCE_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-competitive-intelligence');
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
    const result = await generateCompetitiveIntelligence(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-competitive-intelligence').catch(() => {});
    const safe = safeError(e, 'creative/ad-competitive-intelligence', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
