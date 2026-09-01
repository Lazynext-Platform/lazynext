import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_IMPLEMENTATION_INTENTION_DESIGNER_CREDIT_COST,
  generateImplementationIntentions,
  validateAdCreativeImplementationIntentionDesignerInput,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_ACTION_LENGTH,
  MAX_CONTEXT_LENGTH,
  type AdCreativeImplementationIntentionDesignerInput,
} from '@/lib/creative/ad-creative-implementation-intention-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-implementation-intention-designer
 * Returns the credit cost and schema info (no auth required for catalog metadata).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-implementation-intention-designer',
    creditCost: AD_CREATIVE_IMPLEMENTATION_INTENTION_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        desiredAction: `string (required, max ${MAX_ACTION_LENGTH} chars)`,
        context: `string (required, max ${MAX_CONTEXT_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        ifThenPlans: 'IfThenPlan[]',
        bestPlan: 'string',
        adCopy: 'ImplementationIntentionAdCopy',
        commitmentDevice: 'string',
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

  const desiredAction =
    typeof body.desiredAction === 'string'
      ? body.desiredAction.trim().slice(0, MAX_ACTION_LENGTH)
      : '';

  const context =
    typeof body.context === 'string'
      ? body.context.trim().slice(0, MAX_CONTEXT_LENGTH)
      : '';

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeImplementationIntentionDesignerInput = {
    productOrBrand,
    targetAudience,
    desiredAction,
    context,
    dryRun,
  };

  const validation = validateAdCreativeImplementationIntentionDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_IMPLEMENTATION_INTENTION_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-implementation-intention-designer');
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
    const result = await generateImplementationIntentions(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-implementation-intention-designer').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-implementation-intention-designer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
