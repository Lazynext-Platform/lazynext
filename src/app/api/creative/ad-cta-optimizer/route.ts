import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CTA_OPTIMIZER_CREDIT_COST,
  optimizeCTAs,
  validateAdCTAOptimizerInput,
  VALID_PLATFORMS,
  VALID_URGENCY_LEVELS,
  MAX_PRODUCT_LENGTH,
  MAX_GOAL_LENGTH,
  MAX_CURRENT_CTA_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdCTAOptimizerInput,
} from '@/lib/creative/ad-cta-optimizer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-cta-optimizer
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-cta-optimizer',
    creditCost: AD_CTA_OPTIMIZER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        goal: `string (optional, max ${MAX_GOAL_LENGTH} chars)`,
        currentCTA: `string (optional, max ${MAX_CURRENT_CTA_LENGTH} chars)`,
        count: `number (optional, ${MIN_COUNT}-${MAX_COUNT}, default ${DEFAULT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        ctas: 'AdCTA[]',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      urgencyLevels: VALID_URGENCY_LEVELS,
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

  const goal =
    typeof body.goal === 'string' ? body.goal.trim().slice(0, MAX_GOAL_LENGTH) : undefined;

  const currentCTA =
    typeof body.currentCTA === 'string' ? body.currentCTA.trim().slice(0, MAX_CURRENT_CTA_LENGTH) : undefined;

  const count =
    typeof body.count === 'number' && Number.isFinite(body.count)
      ? Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(body.count)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCTAOptimizerInput = {
    productOrBrand,
    platform,
    goal,
    currentCTA,
    count,
    dryRun,
  };

  const validation = validateAdCTAOptimizerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CTA_OPTIMIZER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-cta-optimizer');
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
    const result = await optimizeCTAs(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-cta-optimizer').catch(() => {});
    const safe = safeError(e, 'creative/ad-cta-optimizer', 'optimize_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
