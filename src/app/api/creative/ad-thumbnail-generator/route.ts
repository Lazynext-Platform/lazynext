import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_THUMBNAIL_GENERATOR_CREDIT_COST,
  generateThumbnails,
  validateAdThumbnailGeneratorInput,
  VALID_PLATFORMS,
  VALID_STYLES,
  VALID_TEXT_POSITIONS,
  MAX_PRODUCT_LENGTH,
  MAX_VIDEO_TITLE_LENGTH,
  MAX_VIDEO_TOPIC_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdThumbnailGeneratorInput,
} from '@/lib/creative/ad-thumbnail-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-thumbnail-generator
 * Returns the credit cost, schema info, and supported platforms/styles (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-thumbnail-generator',
    creditCost: AD_THUMBNAIL_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        videoTitle: `string (optional, max ${MAX_VIDEO_TITLE_LENGTH} chars)`,
        videoTopic: `string (optional, max ${MAX_VIDEO_TOPIC_LENGTH} chars)`,
        style: 'string (optional: bold, minimal, playful, dramatic, lifestyle)',
        count: `number (optional, ${MIN_COUNT}-${MAX_COUNT}, default ${DEFAULT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        thumbnails: 'ThumbnailConcept[]',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      styles: VALID_STYLES,
      textPositions: VALID_TEXT_POSITIONS,
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

  const videoTitle =
    typeof body.videoTitle === 'string' ? body.videoTitle.trim().slice(0, MAX_VIDEO_TITLE_LENGTH) : undefined;

  const videoTopic =
    typeof body.videoTopic === 'string' ? body.videoTopic.trim().slice(0, MAX_VIDEO_TOPIC_LENGTH) : undefined;

  const style =
    typeof body.style === 'string' && VALID_STYLES.includes(body.style as never)
      ? (body.style as 'bold' | 'minimal' | 'playful' | 'dramatic' | 'lifestyle')
      : undefined;

  const count =
    typeof body.count === 'number' && Number.isFinite(body.count)
      ? Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(body.count)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdThumbnailGeneratorInput = {
    productOrBrand,
    platform,
    videoTitle,
    videoTopic,
    style,
    count,
    dryRun,
  };

  const validation = validateAdThumbnailGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_THUMBNAIL_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-thumbnail-generator');
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
    const result = await generateThumbnails(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-thumbnail-generator').catch(() => {});
    const safe = safeError(e, 'creative/ad-thumbnail-generator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
