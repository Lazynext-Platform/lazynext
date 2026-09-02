import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_AD_PERSUASION_STRATEGIST_CREDIT_COST,
  generatePersuasionStrategy,
  validateCreativeAdPersuasionStrategistInput,
  VALID_PLATFORMS,
  VALID_PRINCIPLES,
  VALID_STRENGTHS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_CONTENT_LENGTH,
  type CreativeAdPersuasionStrategistInput,
} from '@/lib/creative/creative-ad-persuasion-strategist';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-ad-persuasion-strategist
 * Returns the credit cost, schema info, and supported platforms/principles/
 * strengths (no auth required for catalog metadata — same pattern as other
 * creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-ad-persuasion-strategist',
    creditCost: CREATIVE_AD_PERSUASION_STRATEGIST_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        strategy: 'PersuasionStrategy',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      principles: VALID_PRINCIPLES,
      strengths: VALID_STRENGTHS,
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

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : '';

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeAdPersuasionStrategistInput = {
    productOrBrand,
    targetAudience,
    content,
    platform,
    dryRun,
  };

  const validation = validateCreativeAdPersuasionStrategistInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_AD_PERSUASION_STRATEGIST_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-ad-persuasion-strategist');
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
    const result = await generatePersuasionStrategy(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-ad-persuasion-strategist').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/creative-ad-persuasion-strategist', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
