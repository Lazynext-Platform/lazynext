import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_STORY_GENERATOR_CREDIT_COST,
  generateAdStory,
  validateAdStoryGeneratorInput,
  VALID_PLATFORMS,
  VALID_STORY_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_TARGET_AUDIENCE_LENGTH,
  MIN_DURATION,
  MAX_DURATION,
  DEFAULT_DURATION,
  type AdStoryGeneratorInput,
  type StoryType,
} from '@/lib/creative/ad-story-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-story-generator
 * Returns the credit cost, schema info, and supported platforms/story types
 * (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-story-generator',
    creditCost: AD_STORY_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        storyType: 'string (required: transformation, journey, conflict, resolution, aspiration)',
        targetAudience: `string (optional, max ${MAX_TARGET_AUDIENCE_LENGTH} chars)`,
        duration: `number (optional, ${MIN_DURATION}-${MAX_DURATION} seconds, default ${DEFAULT_DURATION})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        story: 'AdStory',
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

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const storyType =
    typeof body.storyType === 'string' && VALID_STORY_TYPES.includes(body.storyType as never)
      ? (body.storyType as 'transformation' | 'journey' | 'conflict' | 'resolution' | 'aspiration')
      : '';

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_TARGET_AUDIENCE_LENGTH) : undefined;

  const duration =
    typeof body.duration === 'number' && Number.isFinite(body.duration)
      ? Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(body.duration)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdStoryGeneratorInput = {
    productOrBrand,
    platform,
    storyType: storyType as StoryType,
    targetAudience,
    duration,
    dryRun,
  };

  const validation = validateAdStoryGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_STORY_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-story-generator');
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
    const result = await generateAdStory(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-story-generator').catch(() => {});
    const safe = safeError(e, 'creative/ad-story-generator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
