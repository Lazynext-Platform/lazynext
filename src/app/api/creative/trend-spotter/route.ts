import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  TREND_SPOTTER_CREDIT_COST,
  spotTrends,
  validateTrendSpotterInput,
  VALID_PLATFORMS,
  MAX_NICHE_LENGTH,
  type TrendSpotterInput,
} from '@/lib/creative/trend-spotter';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/trend-spotter
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'trend-spotter',
    creditCost: TREND_SPOTTER_CREDIT_COST,
    schema: {
      input: {
        niche: `string (required, max ${MAX_NICHE_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        region: 'string (optional, max 200 chars)',
        dryRun: 'boolean (optional)',
      },
      output: {
        trends: 'Trend[]',
        niche: 'string',
        platform: 'string',
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

  const niche =
    typeof body.niche === 'string' ? body.niche.trim().slice(0, MAX_NICHE_LENGTH) : '';

  const region =
    typeof body.region === 'string' ? body.region.trim().slice(0, 200) : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: TrendSpotterInput = {
    niche,
    platform,
    region,
    dryRun,
  };

  const validation = validateTrendSpotterInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = TREND_SPOTTER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:trend-spotter');
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
    const result = await spotTrends(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:trend-spotter').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/trend-spotter', 'spot_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
