import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_HOOK_STORY_OFFER_DESIGNER_CREDIT_COST,
  generateHookStoryOffer,
  validateAdCreativeHookStoryOfferDesignerInput,
  VALID_PLATFORMS,
  VALID_HOOK_TYPES,
  VALID_STORY_ARCS,
  VALID_OFFER_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeHookStoryOfferDesignerInput,
} from '@/lib/creative/ad-creative-hook-story-offer-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-hook-story-offer-designer
 * Returns the credit cost, schema info, and supported platforms/types
 * (no auth required for catalog metadata).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-hook-story-offer-designer',
    creditCost: AD_CREATIVE_HOOK_STORY_OFFER_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        framework: 'HookStoryOfferFramework',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      hookTypes: VALID_HOOK_TYPES,
      storyArcs: VALID_STORY_ARCS,
      offerTypes: VALID_OFFER_TYPES,
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

  const targetAudience =
    typeof body.targetAudience === 'string'
      ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH)
      : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeHookStoryOfferDesignerInput = {
    productOrBrand,
    targetAudience,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeHookStoryOfferDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_HOOK_STORY_OFFER_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-hook-story-offer-designer');
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
    const result = await generateHookStoryOffer(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-hook-story-offer-designer').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-creative-hook-story-offer-designer', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
