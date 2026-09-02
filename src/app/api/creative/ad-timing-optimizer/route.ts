import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_TIMING_OPTIMIZER_CREDIT_COST,
  optimizeTiming,
  validateAdTimingOptimizerInput,
  VALID_PLATFORMS,
  MAX_AUDIENCE_LENGTH,
  MAX_TIMEZONE_LENGTH,
  MAX_CATEGORY_LENGTH,
  DEFAULT_TIMEZONE,
  type AdTimingOptimizerInput,
} from '@/lib/creative/ad-timing-optimizer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-timing-optimizer
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-timing-optimizer',
    creditCost: AD_TIMING_OPTIMIZER_CREDIT_COST,
    schema: {
      input: {
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        audienceDescription: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        timezone: `string (optional, max ${MAX_TIMEZONE_LENGTH} chars, default ${DEFAULT_TIMEZONE})`,
        productCategory: `string (optional, max ${MAX_CATEGORY_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        optimalSlots: 'OptimalSlot[]',
        timezone: 'string',
        summary: 'string',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const audienceDescription =
    typeof body.audienceDescription === 'string' ? body.audienceDescription.trim().slice(0, MAX_AUDIENCE_LENGTH) : '';

  const timezone =
    typeof body.timezone === 'string' ? body.timezone.trim().slice(0, MAX_TIMEZONE_LENGTH) : undefined;

  const productCategory =
    typeof body.productCategory === 'string' ? body.productCategory.trim().slice(0, MAX_CATEGORY_LENGTH) : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdTimingOptimizerInput = {
    platform,
    audienceDescription,
    timezone,
    productCategory,
    dryRun,
  };

  const validation = validateAdTimingOptimizerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_TIMING_OPTIMIZER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-timing-optimizer');
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
    const result = await optimizeTiming(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-timing-optimizer').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-timing-optimizer', 'optimize_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
