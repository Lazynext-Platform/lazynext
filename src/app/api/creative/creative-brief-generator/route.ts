import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_BRIEF_GENERATOR_CREDIT_COST,
  generateCreativeBrief,
  validateCreativeBriefGeneratorInput,
  VALID_PLATFORMS,
  VALID_BUDGETS,
  MAX_PRODUCT_LENGTH,
  MAX_GOAL_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeBriefGeneratorInput,
} from '@/lib/creative/creative-brief-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-brief-generator
 * Returns the credit cost, schema info, and supported platforms/budgets (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-brief-generator',
    creditCost: CREATIVE_BRIEF_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        campaignGoal: `string (required, max ${MAX_GOAL_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        targetAudience: `string (optional, max ${MAX_AUDIENCE_LENGTH} chars)`,
        budget: 'string (optional: low, medium, high)',
        dryRun: 'boolean (optional)',
      },
      output: {
        brief: 'CreativeBrief',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      budgets: VALID_BUDGETS,
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

  const campaignGoal =
    typeof body.campaignGoal === 'string' ? body.campaignGoal.trim().slice(0, MAX_GOAL_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : undefined;

  const budget =
    typeof body.budget === 'string' && VALID_BUDGETS.includes(body.budget as never)
      ? body.budget
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeBriefGeneratorInput = {
    productOrBrand,
    campaignGoal,
    platform,
    targetAudience,
    budget,
    dryRun,
  };

  const validation = validateCreativeBriefGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_BRIEF_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-brief-generator');
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
    const result = await generateCreativeBrief(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-brief-generator').catch(() => {});
    const safe = safeError(e, 'creative/creative-brief-generator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
