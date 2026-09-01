import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AB_TEST_PLANNER_CREDIT_COST,
  planABTest,
  validateABTestPlannerInput,
  type ABTestPlannerInput,
} from '@/lib/creative/ab-test-planner';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 90;

/**
 * GET /api/creative/ab-test-planner-v2
 * Returns the credit cost and the input/output schema (no auth required for
 * catalog metadata — same pattern as other creative catalog endpoints).
 *
 * The route is at `/api/creative/ab-test-planner-v2` (with -v2 suffix) because
 * there is already an existing `/api/creative/ab-test/plan` route. This v2
 * route exposes the new self-contained `ab-test-planner.ts` library.
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ab-test-planner-v2',
    creditCost: AB_TEST_PLANNER_CREDIT_COST,
    schema: {
      input: {
        baseCreative: 'string (required, max 5000 chars)',
        platform: 'string (required, max 100 chars)',
        goal: 'string (required, max 500 chars)',
        audienceSize: 'number (optional, > 0)',
        currentCTR: 'number (optional, 0-100, as a percentage)',
        budget: 'number (optional, >= 0)',
        dryRun: 'boolean (optional)',
      },
      output: {
        plan: 'ABTestPlan',
        dryRun: 'boolean',
      },
      planShape: {
        testName: 'string',
        hypothesis: 'string',
        variants: 'TestVariant[]',
        metrics: 'TestMetric[]',
        sampleSizePerVariant: 'number',
        estimatedDurationDays: 'number',
        confidenceLevel: 'number',
        statisticalPower: 'number',
        successCriteria: 'string[]',
        failureCriteria: 'string[]',
        segmentRecommendations: 'string[]',
        notes: 'string[]',
      },
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const baseCreative =
    typeof body.baseCreative === 'string' ? body.baseCreative.trim().slice(0, 5000) : '';
  const platform =
    typeof body.platform === 'string' ? body.platform.trim().slice(0, 100) : '';
  const goal =
    typeof body.goal === 'string' ? body.goal.trim().slice(0, 500) : '';

  const audienceSize =
    typeof body.audienceSize === 'number' && Number.isFinite(body.audienceSize)
      ? body.audienceSize
      : undefined;
  const currentCTR =
    typeof body.currentCTR === 'number' && Number.isFinite(body.currentCTR)
      ? body.currentCTR
      : undefined;
  const budget =
    typeof body.budget === 'number' && Number.isFinite(body.budget)
      ? body.budget
      : undefined;
  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: ABTestPlannerInput = {
    baseCreative,
    platform,
    goal,
    audienceSize,
    currentCTR,
    budget,
    dryRun,
  };

  const validation = validateABTestPlannerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AB_TEST_PLANNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ab-test-planner-v2');
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
    const result = await planABTest(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ab-test-planner-v2').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ab-test-planner-v2', 'plan_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
