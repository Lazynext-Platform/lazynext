import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_QUALITY_SCORER_CREDIT_COST,
  generateQualityScore,
  validateCreativeQualityScorerInput,
  VALID_PLATFORMS,
  VALID_CONTENT_TYPES,
  VALID_GRADES,
  VALID_SEVERITIES,
  DEFAULT_CONTENT_TYPE,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeQualityScorerInput,
} from '@/lib/creative/creative-quality-scorer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-quality-scorer
 * Returns the credit cost, schema info, and supported platforms/content
 * types/grades/severities (no auth required for catalog metadata — same
 * pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-quality-scorer',
    creditCost: CREATIVE_QUALITY_SCORER_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        contentType: `string (optional: ${VALID_CONTENT_TYPES.join(', ')} — default ${DEFAULT_CONTENT_TYPE})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        scoring: 'QualityScoring',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      contentTypes: VALID_CONTENT_TYPES,
      grades: VALID_GRADES,
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

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const contentType =
    typeof body.contentType === 'string' && VALID_CONTENT_TYPES.includes(body.contentType as never)
      ? body.contentType
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeQualityScorerInput = {
    content,
    productOrBrand,
    contentType,
    platform,
    dryRun,
  };

  const validation = validateCreativeQualityScorerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_QUALITY_SCORER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-quality-scorer');
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
    const result = await generateQualityScore(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-quality-scorer').catch(() => {});
    const safe = safeError(e, 'creative/creative-quality-scorer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
