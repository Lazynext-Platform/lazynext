import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_CHOICE_SIMPLIFIER_DESIGNER_CREDIT_COST,
  generateChoiceSimplification,
  validateAdCreativeChoiceSimplifierDesignerInput,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_OPTIONS,
  MAX_OPTION_NAME_LENGTH,
  MAX_OPTION_DESC_LENGTH,
  MAX_OPTION_PRICE_LENGTH,
  type AdCreativeChoiceSimplifierDesignerInput,
  type ChoiceOption,
} from '@/lib/creative/ad-creative-choice-simplifier-designer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-choice-simplifier-designer
 * Returns the credit cost and schema info (no auth required for catalog metadata).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-choice-simplifier-designer',
    creditCost: AD_CREATIVE_CHOICE_SIMPLIFIER_DESIGNER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        options: `array (required, min 2, max ${MAX_OPTIONS}) of { name: string (max ${MAX_OPTION_NAME_LENGTH}), description: string (max ${MAX_OPTION_DESC_LENGTH}), price: string (max ${MAX_OPTION_PRICE_LENGTH}) }`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        recommendedOption: 'RecommendedOption',
        simplificationCopy: 'SimplificationCopy',
        decisionTree: 'string[]',
        cognitiveLoadReduction: 'string',
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

  const rawOptions = Array.isArray(body.options) ? body.options : [];
  const options: ChoiceOption[] = rawOptions.slice(0, MAX_OPTIONS).map((opt: unknown) => {
    const o = (opt && typeof opt === 'object' ? opt : {}) as Record<string, unknown>;
    return {
      name: typeof o.name === 'string' ? o.name.trim().slice(0, MAX_OPTION_NAME_LENGTH) : '',
      description:
        typeof o.description === 'string' ? o.description.trim().slice(0, MAX_OPTION_DESC_LENGTH) : '',
      price: typeof o.price === 'string' ? o.price.trim().slice(0, MAX_OPTION_PRICE_LENGTH) : '',
    };
  });

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeChoiceSimplifierDesignerInput = {
    productOrBrand,
    options,
    targetAudience,
    dryRun,
  };

  const validation = validateAdCreativeChoiceSimplifierDesignerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_CHOICE_SIMPLIFIER_DESIGNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-choice-simplifier-designer');
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
    const result = await generateChoiceSimplification(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-choice-simplifier-designer').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-choice-simplifier-designer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
