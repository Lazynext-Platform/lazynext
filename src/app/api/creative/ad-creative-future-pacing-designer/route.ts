import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_FUTURE_PACING_DESIGNER_CREDIT_COST,
  generateFuturePacing,
  validateAdCreativeFuturePacingDesignerInput,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_OUTCOME_LENGTH,
  type AdCreativeFuturePacingDesignerInput,
} from '@/lib/creative/ad-creative-future-pacing-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-future-pacing-designer
 * Returns the credit cost and schema info (no auth required for catalog metadata).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-future-pacing-designer',
    creditCost: AD_CREATIVE_FUTURE_PACING_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        desiredOutcome: `string (required, max ${MAX_OUTCOME_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        futureScenarios: 'FutureScenario[]',
        adCopy: 'FuturePacingAdCopy',
        visualizationPrompt: 'string',
        dryRun: 'boolean',
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

  const productOrBrand =
    typeof body.productOrBrand === 'string'
      ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH)
      : '';

  const targetAudience =
    typeof body.targetAudience === 'string'
      ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH)
      : '';

  const desiredOutcome =
    typeof body.desiredOutcome === 'string'
      ? body.desiredOutcome.trim().slice(0, MAX_OUTCOME_LENGTH)
      : '';

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeFuturePacingDesignerInput = {
    productOrBrand,
    targetAudience,
    desiredOutcome,
    dryRun,
  };

  const validation = validateAdCreativeFuturePacingDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_FUTURE_PACING_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-future-pacing-designer');
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
    const result = await generateFuturePacing(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-future-pacing-designer').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-future-pacing-designer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
