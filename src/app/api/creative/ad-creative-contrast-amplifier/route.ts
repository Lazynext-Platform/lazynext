import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_CONTRAST_AMPLIFIER_CREDIT_COST,
  generateContrastAmplification,
  validateAdCreativeContrastAmplifierInput,
  VALID_PLATFORMS,
  VALID_CONTRAST_TYPES,
  DEFAULT_CONTRAST_TYPE,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdCreativeContrastAmplifierInput,
} from '@/lib/creative/ad-creative-contrast-amplifier';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-contrast-amplifier
 * Returns the credit cost, schema info, and supported platforms/contrast
 * types (no auth required for catalog metadata — same pattern as other
 * creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-contrast-amplifier',
    creditCost: AD_CREATIVE_CONTRAST_AMPLIFIER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        contrastType: `string (optional: ${VALID_CONTRAST_TYPES.join(', ')} — default ${DEFAULT_CONTRAST_TYPE})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        analysis: 'ContrastAnalysis',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      contrastTypes: VALID_CONTRAST_TYPES,
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
    typeof body.productOrBrand === 'string'
      ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH)
      : '';

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const contrastType =
    typeof body.contrastType === 'string' &&
    VALID_CONTRAST_TYPES.includes(body.contrastType as never)
      ? body.contrastType
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeContrastAmplifierInput = {
    productOrBrand,
    content,
    contrastType,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeContrastAmplifierInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_CONTRAST_AMPLIFIER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-contrast-amplifier');
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
    const result = await generateContrastAmplification(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-contrast-amplifier').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-creative-contrast-amplifier', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
