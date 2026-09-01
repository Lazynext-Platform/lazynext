import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_AUDIENCE_SEGMENT_BUILDER_CREDIT_COST,
  generateAudienceSegments,
  validateAdAudienceSegmentBuilderInput,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MIN_SEGMENT_COUNT,
  MAX_SEGMENT_COUNT,
  DEFAULT_SEGMENT_COUNT,
  type AdAudienceSegmentBuilderInput,
} from '@/lib/creative/ad-audience-segment-builder';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-audience-segment-builder
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-audience-segment-builder',
    creditCost: AD_AUDIENCE_SEGMENT_BUILDER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        primaryAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        platform: `string (optional: ${VALID_PLATFORMS.join(', ')})`,
        segmentCount: `number (optional, ${MIN_SEGMENT_COUNT}-${MAX_SEGMENT_COUNT}, default ${DEFAULT_SEGMENT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        segments: 'AudienceSegment[]',
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

  const primaryAudience =
    typeof body.primaryAudience === 'string' ? body.primaryAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const segmentCount =
    typeof body.segmentCount === 'number' && Number.isFinite(body.segmentCount)
      ? Math.max(MIN_SEGMENT_COUNT, Math.min(MAX_SEGMENT_COUNT, Math.round(body.segmentCount)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdAudienceSegmentBuilderInput = {
    productOrBrand,
    primaryAudience,
    platform,
    segmentCount,
    dryRun,
  };

  const validation = validateAdAudienceSegmentBuilderInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_AUDIENCE_SEGMENT_BUILDER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-audience-segment-builder');
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
    const result = await generateAudienceSegments(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-audience-segment-builder').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-audience-segment-builder', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
