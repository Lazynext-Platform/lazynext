import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_BUDGET_ALLOCATOR_CREDIT_COST,
  allocateBudget,
  validateAdBudgetAllocatorInput,
  VALID_PLATFORMS,
  VALID_GOALS,
  MAX_PRODUCT_LENGTH,
  MAX_BUDGET_LENGTH,
  type AdBudgetAllocatorInput,
  type CampaignGoal,
} from '@/lib/creative/ad-budget-allocator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-budget-allocator
 * Returns the credit cost, schema info, and supported platforms/goals (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-budget-allocator',
    creditCost: AD_BUDGET_ALLOCATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        totalBudget: `string (required, e.g., "$10,000", max ${MAX_BUDGET_LENGTH} chars)`,
        campaignGoal: `string (required: ${VALID_GOALS.join(', ')})`,
        platforms: `string[] (optional: ${VALID_PLATFORMS.join(', ')})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        allocation: 'BudgetAllocation',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
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

  const totalBudget =
    typeof body.totalBudget === 'string' ? body.totalBudget.trim().slice(0, MAX_BUDGET_LENGTH) : '';

  const campaignGoal =
    typeof body.campaignGoal === 'string' && VALID_GOALS.includes(body.campaignGoal as CampaignGoal)
      ? (body.campaignGoal as CampaignGoal)
      : '';

  let platforms: string[] | undefined;
  if (Array.isArray(body.platforms)) {
    platforms = body.platforms.filter(
      (p: unknown) => typeof p === 'string' && VALID_PLATFORMS.includes(p as string),
    );
    if (platforms!.length === 0) platforms = undefined;
  }

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdBudgetAllocatorInput = {
    productOrBrand,
    totalBudget,
    campaignGoal: campaignGoal as CampaignGoal,
    platforms,
    dryRun,
  };

  const validation = validateAdBudgetAllocatorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_BUDGET_ALLOCATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-budget-allocator');
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
    const result = await allocateBudget(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-budget-allocator').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-budget-allocator', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
