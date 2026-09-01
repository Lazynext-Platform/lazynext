import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_BURNOUT_DETECTOR_CREDIT_COST,
  generateBurnoutAnalysis,
  validateAdCreativeBurnoutDetectorInput,
  VALID_PLATFORMS,
  VALID_BURNOUT_LEVELS,
  VALID_REFRESH_PRIORITIES,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_DAYS,
  type AdCreativeBurnoutDetectorInput,
} from '@/lib/creative/ad-creative-burnout-detector';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-burnout-detector
 * Returns the credit cost, schema info, and supported platforms/burnout
 * levels/refresh priorities (no auth required for catalog metadata — same
 * pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-burnout-detector',
    creditCost: AD_CREATIVE_BURNOUT_DETECTOR_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        daysRunning: `number (required, 0-${MAX_DAYS})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        analysis: 'BurnoutAnalysis',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      burnoutLevels: VALID_BURNOUT_LEVELS,
      refreshPriorities: VALID_REFRESH_PRIORITIES,
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

  const daysRunning =
    typeof body.daysRunning === 'number' && Number.isFinite(body.daysRunning)
      ? Math.max(0, Math.min(MAX_DAYS, Math.floor(body.daysRunning)))
      : -1;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeBurnoutDetectorInput = {
    content,
    productOrBrand,
    daysRunning,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeBurnoutDetectorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_BURNOUT_DETECTOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-burnout-detector');
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
    const result = await generateBurnoutAnalysis(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-burnout-detector').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-creative-burnout-detector', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
