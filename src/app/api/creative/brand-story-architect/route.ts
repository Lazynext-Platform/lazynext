import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  BRAND_STORY_ARCHITECT_CREDIT_COST,
  generateBrandStory,
  validateBrandStoryArchitectInput,
  VALID_PLATFORMS,
  VALID_STORY_TYPES,
  MAX_BRAND_NAME_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_BRAND_VALUES_LENGTH,
  type BrandStoryArchitectInput,
  type StoryType,
} from '@/lib/creative/brand-story-architect';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/brand-story-architect
 * Returns the credit cost, schema info, and supported platforms/story types
 * (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'brand-story-architect',
    creditCost: BRAND_STORY_ARCHITECT_CREDIT_COST,
    schema: {
      input: {
        brandName: `string (required, max ${MAX_BRAND_NAME_LENGTH} chars)`,
        productOrService: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        brandValues: `string (required, max ${MAX_BRAND_VALUES_LENGTH} chars)`,
        storyType: 'string (optional: hero-journey, before-after, problem-solution, transformation, legacy, rebellion)',
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        story: 'BrandStory',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      storyTypes: VALID_STORY_TYPES,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const brandName =
    typeof body.brandName === 'string' ? body.brandName.trim().slice(0, MAX_BRAND_NAME_LENGTH) : '';

  const productOrService =
    typeof body.productOrService === 'string' ? body.productOrService.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const brandValues =
    typeof body.brandValues === 'string' ? body.brandValues.trim().slice(0, MAX_BRAND_VALUES_LENGTH) : '';

  const storyType =
    typeof body.storyType === 'string' && VALID_STORY_TYPES.includes(body.storyType as StoryType)
      ? (body.storyType as StoryType)
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: BrandStoryArchitectInput = {
    brandName,
    productOrService,
    brandValues,
    storyType,
    platform,
    dryRun,
  };

  const validation = validateBrandStoryArchitectInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = BRAND_STORY_ARCHITECT_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:brand-story-architect');
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
    const result = await generateBrandStory(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:brand-story-architect').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/brand-story-architect', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
