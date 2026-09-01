import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_PAIN_OF_PAYING_DESIGNER_CREDIT_COST,
  generatePainOfPayingStrategies,
  validateAdCreativePainOfPayingDesignerInput,
  VALID_STRATEGY_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_PRICE_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_FRICTION_LENGTH,
  type AdCreativePainOfPayingDesignerInput,
} from '@/lib/creative/ad-creative-pain-of-paying-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-pain-of-paying-designer
 * Returns the credit cost, schema info, and supported strategy types
 * (no auth required for catalog metadata).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-pain-of-paying-designer',
    creditCost: AD_CREATIVE_PAIN_OF_PAYING_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        price: `string (required, max ${MAX_PRICE_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        paymentFrictionPoints: `string (required, max ${MAX_FRICTION_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        strategies: 'PainOfPayingStrategy[]',
        bestStrategy: 'string',
        adCopy: 'PainOfPayingAdCopy',
        dryRun: 'boolean',
      },
      strategyTypes: VALID_STRATEGY_TYPES,
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

  const price =
    typeof body.price === 'string' ? body.price.trim().slice(0, MAX_PRICE_LENGTH) : '';

  const targetAudience =
    typeof body.targetAudience === 'string'
      ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH)
      : '';

  const paymentFrictionPoints =
    typeof body.paymentFrictionPoints === 'string'
      ? body.paymentFrictionPoints.trim().slice(0, MAX_FRICTION_LENGTH)
      : '';

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativePainOfPayingDesignerInput = {
    productOrBrand,
    price,
    targetAudience,
    paymentFrictionPoints,
    dryRun,
  };

  const validation = validateAdCreativePainOfPayingDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_PAIN_OF_PAYING_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-pain-of-paying-designer');
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
    const result = await generatePainOfPayingStrategies(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-pain-of-paying-designer').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-pain-of-paying-designer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
