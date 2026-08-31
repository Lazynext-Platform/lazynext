import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_STORY_ARC_DESIGNER_CREDIT_COST,
  generateStoryArc,
  validateAdCreativeStoryArcDesignerInput,
  VALID_PLATFORMS,
  VALID_EMOTIONS,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_MESSAGE_LENGTH,
  type AdCreativeStoryArcDesignerInput,
} from '@/lib/creative/ad-creative-story-arc-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-story-arc-designer
 * Returns the credit cost, schema info, and supported platforms/emotions/
 * impacts (no auth required for catalog metadata — same pattern as other
 * creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-story-arc-designer',
    creditCost: AD_CREATIVE_STORY_ARC_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        coreMessage: `string (required, max ${MAX_MESSAGE_LENGTH} chars)`,
        targetEmotion: `string (optional: ${VALID_EMOTIONS.join(', ')})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        arc: 'StoryArc',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      emotions: VALID_EMOTIONS,
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

  const coreMessage =
    typeof body.coreMessage === 'string'
      ? body.coreMessage.trim().slice(0, MAX_MESSAGE_LENGTH)
      : '';

  const targetEmotion =
    typeof body.targetEmotion === 'string' && VALID_EMOTIONS.includes(body.targetEmotion)
      ? body.targetEmotion
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeStoryArcDesignerInput = {
    productOrBrand,
    coreMessage,
    targetEmotion,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeStoryArcDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_STORY_ARC_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-story-arc-designer');
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
    const result = await generateStoryArc(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-story-arc-designer').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-story-arc-designer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
