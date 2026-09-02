import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_AD_VISUAL_HIERARCHY_STRATEGIST_CREDIT_COST,
  generateHierarchyStrategy,
  validateCreativeAdVisualHierarchyStrategistInput,
  VALID_PLATFORMS,
  VALID_LAYER_TYPES,
  VALID_SIZES,
  VALID_PRIORITIES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_ELEMENTS_LENGTH,
  type CreativeAdVisualHierarchyStrategistInput,
} from '@/lib/creative/creative-ad-visual-hierarchy-strategist';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-ad-visual-hierarchy-strategist
 * Returns the credit cost, schema info, and supported platforms/layer types/
 * sizes/priorities (no auth required for catalog metadata — same pattern as
 * other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-ad-visual-hierarchy-strategist',
    creditCost: CREATIVE_AD_VISUAL_HIERARCHY_STRATEGIST_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        visualElements: `string (required, max ${MAX_ELEMENTS_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        strategy: 'HierarchyStrategy',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      layerTypes: VALID_LAYER_TYPES,
      sizes: VALID_SIZES,
      priorities: VALID_PRIORITIES,
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

  const visualElements =
    typeof body.visualElements === 'string'
      ? body.visualElements.trim().slice(0, MAX_ELEMENTS_LENGTH)
      : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeAdVisualHierarchyStrategistInput = {
    productOrBrand,
    content,
    visualElements,
    platform,
    dryRun,
  };

  const validation = validateCreativeAdVisualHierarchyStrategistInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_AD_VISUAL_HIERARCHY_STRATEGIST_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-ad-visual-hierarchy-strategist');
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
    const result = await generateHierarchyStrategy(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-ad-visual-hierarchy-strategist').catch(
      () => {},
    );
    const { error, status } = safeAtlasError(
      e,
      'creative/creative-ad-visual-hierarchy-strategist',
      'generate_failed',
    );
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
