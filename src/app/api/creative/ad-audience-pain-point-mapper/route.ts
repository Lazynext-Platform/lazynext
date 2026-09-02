import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_AUDIENCE_PAIN_POINT_MAPPER_CREDIT_COST,
  generatePainPointMapping,
  validateAdAudiencePainPointMapperInput,
  VALID_PLATFORMS,
  VALID_SEVERITIES,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdAudiencePainPointMapperInput,
} from '@/lib/creative/ad-audience-pain-point-mapper';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-audience-pain-point-mapper
 * Returns the credit cost, schema info, and supported platforms/severities
 * (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-audience-pain-point-mapper',
    creditCost: AD_AUDIENCE_PAIN_POINT_MAPPER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        mapping: 'PainPointMapping',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      severities: VALID_SEVERITIES,
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

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdAudiencePainPointMapperInput = {
    productOrBrand,
    targetAudience,
    platform,
    dryRun,
  };

  const validation = validateAdAudiencePainPointMapperInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_AUDIENCE_PAIN_POINT_MAPPER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-audience-pain-point-mapper');
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
    const result = await generatePainPointMapping(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-audience-pain-point-mapper').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-audience-pain-point-mapper', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
