import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_AUDIENCE_RESONANCE_PREDICTOR_CREDIT_COST,
  generateAudienceResonance,
  validateAdAudienceResonancePredictorInput,
  VALID_PLATFORMS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdAudienceResonancePredictorInput,
} from '@/lib/creative/ad-audience-resonance-predictor';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-audience-resonance-predictor
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-audience-resonance-predictor',
    creditCost: AD_AUDIENCE_RESONANCE_PREDICTOR_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        audienceSegments: `string (required, max ${MAX_AUDIENCE_LENGTH} chars — comma- or newline-separated)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        resonance: 'AudienceResonance',
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

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const audienceSegments =
    typeof body.audienceSegments === 'string'
      ? body.audienceSegments.trim().slice(0, MAX_AUDIENCE_LENGTH)
      : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdAudienceResonancePredictorInput = {
    content,
    productOrBrand,
    audienceSegments,
    platform,
    dryRun,
  };

  const validation = validateAdAudienceResonancePredictorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_AUDIENCE_RESONANCE_PREDICTOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-audience-resonance-predictor');
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
    const result = await generateAudienceResonance(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-audience-resonance-predictor').catch(() => {});
    const safe = safeError(e, 'creative/ad-audience-resonance-predictor', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
