import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_AB_TEST_NAME_GENERATOR_CREDIT_COST,
  generateABTestNames,
  validateAdABTestNameGeneratorInput,
  VALID_TEST_TYPES,
  MAX_PRODUCT_LENGTH,
  MIN_VARIANT_COUNT,
  MAX_VARIANT_COUNT,
  DEFAULT_VARIANT_COUNT,
  type AdABTestNameGeneratorInput,
} from '@/lib/creative/ad-ab-test-name-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-ab-test-name-generator
 * Returns the credit cost, schema info, and supported test types (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-ab-test-name-generator',
    creditCost: AD_AB_TEST_NAME_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        testType: `string (required: ${VALID_TEST_TYPES.join(', ')})`,
        variantCount: `number (optional, ${MIN_VARIANT_COUNT}-${MAX_VARIANT_COUNT}, default ${DEFAULT_VARIANT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        testNames: 'TestVariantName[]',
        testSeriesName: 'string',
        dryRun: 'boolean',
      },
      testTypes: VALID_TEST_TYPES,
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

  const testType =
    typeof body.testType === 'string' && VALID_TEST_TYPES.includes(body.testType as never)
      ? body.testType
      : '';

  const variantCount =
    typeof body.variantCount === 'number' && Number.isFinite(body.variantCount)
      ? Math.max(MIN_VARIANT_COUNT, Math.min(MAX_VARIANT_COUNT, Math.round(body.variantCount)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdABTestNameGeneratorInput = {
    productOrBrand,
    testType,
    variantCount,
    dryRun,
  };

  const validation = validateAdABTestNameGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_AB_TEST_NAME_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-ab-test-name-generator');
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
    const result = await generateABTestNames(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-ab-test-name-generator').catch(() => {});
    const safe = safeError(e, 'creative/ad-ab-test-name-generator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
