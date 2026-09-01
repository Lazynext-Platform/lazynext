import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_ROTATOR_CREDIT_COST,
  rotateCreatives,
  validateAdCreativeRotatorInput,
  VALID_PLATFORMS,
  VALID_VARIATION_TYPES,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MIN_VARIATION_COUNT,
  MAX_VARIATION_COUNT,
  DEFAULT_VARIATION_COUNT,
  type AdCreativeRotatorInput,
} from '@/lib/creative/ad-creative-rotator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-rotator
 * Returns the credit cost, schema info, and supported platforms/variation
 * types (no auth required for catalog metadata — same pattern as other
 * creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-rotator',
    creditCost: AD_CREATIVE_ROTATOR_CREDIT_COST,
    schema: {
      input: {
        baseContent: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        variationCount: `number (optional, ${MIN_VARIATION_COUNT}-${MAX_VARIATION_COUNT}, default ${DEFAULT_VARIATION_COUNT})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        rotation: 'CreativeRotation',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      variationTypes: VALID_VARIATION_TYPES,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const baseContent =
    typeof body.baseContent === 'string' ? body.baseContent.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const variationCount =
    typeof body.variationCount === 'number' && Number.isFinite(body.variationCount)
      ? Math.max(MIN_VARIATION_COUNT, Math.min(MAX_VARIATION_COUNT, Math.round(body.variationCount)))
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeRotatorInput = {
    baseContent,
    productOrBrand,
    variationCount,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeRotatorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_ROTATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-rotator');
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
    const result = await rotateCreatives(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-rotator').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-creative-rotator', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
