import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_AD_TONE_CALIBRATOR_CREDIT_COST,
  generateToneCalibration,
  validateCreativeAdToneCalibratorInput,
  VALID_PLATFORMS,
  VALID_TONES,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeAdToneCalibratorInput,
} from '@/lib/creative/creative-ad-tone-calibrator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-ad-tone-calibrator
 * Returns the credit cost, schema info, and supported platforms/tones (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-ad-tone-calibrator',
    creditCost: CREATIVE_AD_TONE_CALIBRATOR_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        desiredTone: `string (required: ${VALID_TONES.join(', ')})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        calibration: 'ToneCalibration',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      tones: VALID_TONES,
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

  const desiredTone =
    typeof body.desiredTone === 'string' && VALID_TONES.includes(body.desiredTone as never)
      ? body.desiredTone
      : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeAdToneCalibratorInput = {
    content,
    productOrBrand,
    desiredTone,
    platform,
    dryRun,
  };

  const validation = validateCreativeAdToneCalibratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_AD_TONE_CALIBRATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-ad-tone-calibrator');
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
    const result = await generateToneCalibration(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-ad-tone-calibrator').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/creative-ad-tone-calibrator', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
