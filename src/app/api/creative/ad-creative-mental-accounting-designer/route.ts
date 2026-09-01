import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_MENTAL_ACCOUNTING_DESIGNER_CREDIT_COST,
  generateMentalAccountingReframes,
  validateAdCreativeMentalAccountingDesignerInput,
  VALID_REFRAME_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_PRICE_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeMentalAccountingDesignerInput,
} from '@/lib/creative/ad-creative-mental-accounting-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-mental-accounting-designer
 * Returns the credit cost, schema info, and supported reframe types
 * (no auth required for catalog metadata).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-mental-accounting-designer',
    creditCost: AD_CREATIVE_MENTAL_ACCOUNTING_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        price: `string (required, max ${MAX_PRICE_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        reframes: 'MentalAccountingReframe[]',
        bestReframe: 'string',
        adCopy: 'MentalAccountingAdCopy',
        dryRun: 'boolean',
      },
      reframeTypes: VALID_REFRAME_TYPES,
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

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeMentalAccountingDesignerInput = {
    productOrBrand,
    price,
    targetAudience,
    dryRun,
  };

  const validation = validateAdCreativeMentalAccountingDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_MENTAL_ACCOUNTING_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-mental-accounting-designer');
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
    const result = await generateMentalAccountingReframes(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-mental-accounting-designer').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-mental-accounting-designer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
