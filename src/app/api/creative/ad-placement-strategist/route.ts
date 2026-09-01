import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_PLACEMENT_STRATEGIST_CREDIT_COST,
  generatePlacementStrategy,
  validateAdPlacementStrategistInput,
  VALID_BUDGETS,
  VALID_GOALS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  DEFAULT_BUDGET,
  type AdPlacementStrategistInput,
} from '@/lib/creative/ad-placement-strategist';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-placement-strategist
 * Returns the credit cost, schema info, and supported budgets/goals (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-placement-strategist',
    creditCost: AD_PLACEMENT_STRATEGIST_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        budget: `string (optional: low, medium, high, default ${DEFAULT_BUDGET})`,
        goals: 'string[] (optional: awareness, engagement, conversions, traffic, app_installs)',
        dryRun: 'boolean (optional)',
      },
      output: {
        strategy: 'PlacementStrategy',
        dryRun: 'boolean',
      },
      budgets: VALID_BUDGETS,
      goals: VALID_GOALS,
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

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : '';

  const budget =
    typeof body.budget === 'string' && VALID_BUDGETS.includes(body.budget as never)
      ? body.budget
      : undefined;

  const goals =
    Array.isArray(body.goals) && body.goals.every((g: unknown) => typeof g === 'string' && VALID_GOALS.includes(g))
      ? body.goals as string[]
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdPlacementStrategistInput = {
    productOrBrand,
    targetAudience,
    budget,
    goals,
    dryRun,
  };

  const validation = validateAdPlacementStrategistInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_PLACEMENT_STRATEGIST_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-placement-strategist');
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
    const result = await generatePlacementStrategy(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-placement-strategist').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-placement-strategist', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
