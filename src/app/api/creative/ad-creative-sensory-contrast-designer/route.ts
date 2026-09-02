import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_SENSORY_CONTRAST_DESIGNER_CREDIT_COST,
  generateSensoryContrast,
  validateAdCreativeSensoryContrastDesignerInput,
  VALID_PLATFORMS,
  VALID_CONTRAST_DIMENSIONS,
  VALID_IMPACTS,
  DEFAULT_CONTRAST_DIMENSION,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdCreativeSensoryContrastDesignerInput,
} from '@/lib/creative/ad-creative-sensory-contrast-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-sensory-contrast-designer
 * Returns the credit cost, schema info, and supported platforms/contrast
 * dimensions/impacts (no auth required for catalog metadata — same pattern
 * as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-sensory-contrast-designer',
    creditCost: AD_CREATIVE_SENSORY_CONTRAST_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        contrastDimension: `string (optional: ${VALID_CONTRAST_DIMENSIONS.join(', ')} — default ${DEFAULT_CONTRAST_DIMENSION})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        design: 'SensoryContrastDesign',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      contrastDimensions: VALID_CONTRAST_DIMENSIONS,
      impacts: VALID_IMPACTS,
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

  const contrastDimension =
    typeof body.contrastDimension === 'string' &&
    VALID_CONTRAST_DIMENSIONS.includes(body.contrastDimension)
      ? body.contrastDimension
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeSensoryContrastDesignerInput = {
    productOrBrand,
    content,
    contrastDimension,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeSensoryContrastDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_SENSORY_CONTRAST_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-sensory-contrast-designer');
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
    const result = await generateSensoryContrast(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-sensory-contrast-designer').catch(
      () => {},
    );
    const { error, status } = safeAtlasError(
      e,
      'creative/ad-creative-sensory-contrast-designer',
      'generate_failed',
    );
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
