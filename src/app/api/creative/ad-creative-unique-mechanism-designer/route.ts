import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_UNIQUE_MECHANISM_DESIGNER_CREDIT_COST,
  generateUniqueMechanism,
  validateAdCreativeUniqueMechanismDesignerInput,
  MAX_PRODUCT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeUniqueMechanismDesignerInput,
} from '@/lib/creative/ad-creative-unique-mechanism-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-unique-mechanism-designer
 * Returns the credit cost and schema info (no auth required for catalog metadata).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-unique-mechanism-designer',
    creditCost: AD_CREATIVE_UNIQUE_MECHANISM_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        productDescription: `string (required, max ${MAX_DESCRIPTION_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        mechanism: 'UniqueMechanism',
        differentiationPoints: 'string[]',
        adCopy: 'UniqueMechanismAdCopy',
        proofElements: 'string[]',
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

  const productDescription =
    typeof body.productDescription === 'string'
      ? body.productDescription.trim().slice(0, MAX_DESCRIPTION_LENGTH)
      : '';

  const targetAudience =
    typeof body.targetAudience === 'string'
      ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH)
      : '';

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeUniqueMechanismDesignerInput = {
    productOrBrand,
    productDescription,
    targetAudience,
    dryRun,
  };

  const validation = validateAdCreativeUniqueMechanismDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_UNIQUE_MECHANISM_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-unique-mechanism-designer');
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
    const result = await generateUniqueMechanism(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-unique-mechanism-designer').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-creative-unique-mechanism-designer', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
