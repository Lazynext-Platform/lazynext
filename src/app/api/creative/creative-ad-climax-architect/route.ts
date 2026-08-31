import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_AD_CLIMAX_ARCHITECT_CREDIT_COST,
  generateClimaxArchitecture,
  validateCreativeAdClimaxArchitectInput,
  VALID_PLATFORMS,
  VALID_CLIMAX_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdClimaxArchitectInput,
} from '@/lib/creative/creative-ad-climax-architect';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-ad-climax-architect
 * Returns the credit cost, schema info, and supported platforms/climax types
 * (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-ad-climax-architect',
    creditCost: CREATIVE_AD_CLIMAX_ARCHITECT_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        architecture: 'ClimaxArchitecture',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      climaxTypes: VALID_CLIMAX_TYPES,
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

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeAdClimaxArchitectInput = {
    productOrBrand,
    content,
    targetAudience,
    platform,
    dryRun,
  };

  const validation = validateCreativeAdClimaxArchitectInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_AD_CLIMAX_ARCHITECT_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-ad-climax-architect');
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
    const result = await generateClimaxArchitecture(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-ad-climax-architect').catch(() => {});
    const safe = safeError(e, 'creative/creative-ad-climax-architect', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
