import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_AB_TEST_SIMULATOR_CREDIT_COST,
  generateAbTestSimulation,
  validateAdCreativeAbTestSimulatorInput,
  VALID_PLATFORMS,
  VALID_OBJECTIVES,
  DEFAULT_OBJECTIVE,
  MAX_VARIANT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdCreativeAbTestSimulatorInput,
} from '@/lib/creative/ad-creative-ab-test-simulator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-ab-test-simulator
 * Returns the credit cost, schema info, and supported platforms/objectives
 * (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-ab-test-simulator',
    creditCost: AD_CREATIVE_AB_TEST_SIMULATOR_CREDIT_COST,
    schema: {
      input: {
        variantA: `string (required, max ${MAX_VARIANT_LENGTH} chars)`,
        variantB: `string (required, max ${MAX_VARIANT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        testObjective: `string (optional: ${VALID_OBJECTIVES.join(', ')} — default ${DEFAULT_OBJECTIVE})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        simulation: 'SimulationResult',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      objectives: VALID_OBJECTIVES,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const variantA =
    typeof body.variantA === 'string' ? body.variantA.trim().slice(0, MAX_VARIANT_LENGTH) : '';

  const variantB =
    typeof body.variantB === 'string' ? body.variantB.trim().slice(0, MAX_VARIANT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const testObjective =
    typeof body.testObjective === 'string' && VALID_OBJECTIVES.includes(body.testObjective as never)
      ? body.testObjective
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeAbTestSimulatorInput = {
    variantA,
    variantB,
    productOrBrand,
    testObjective,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeAbTestSimulatorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_AB_TEST_SIMULATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-ab-test-simulator');
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
    const result = await generateAbTestSimulation(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-ab-test-simulator').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-ab-test-simulator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
