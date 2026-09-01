import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_FORMAT_OPTIMIZER_CREDIT_COST,
  optimizeFormat,
  validateAdFormatOptimizerInput,
  VALID_AD_FORMATS,
  VALID_PLATFORMS,
  VALID_BUDGETS,
  VALID_GOALS,
  type AdFormatOptimizerInput,
} from '@/lib/creative/ad-format-optimizer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 90;

/**
 * GET /api/creative/ad-format-optimizer
 * Returns the credit cost, schema info, and available formats (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-format-optimizer',
    creditCost: AD_FORMAT_OPTIMIZER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: 'string (required, max 2000 chars)',
        targetAudience: 'string (optional, max 1000 chars)',
        platforms: 'string[] (optional: tiktok, instagram, youtube, facebook)',
        budget: '"low" | "medium" | "high" (optional)',
        goals: 'string[] (optional: awareness, consideration, conversion, retention)',
        dryRun: 'boolean (optional)',
      },
      output: {
        recommendations: 'FormatRecommendation[]',
        bestPick: 'AdFormat',
        reasoning: 'string',
        dryRun: 'boolean',
      },
      availableFormats: VALID_AD_FORMATS,
      platforms: VALID_PLATFORMS,
      budgets: VALID_BUDGETS,
      goals: VALID_GOALS,
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
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, 2000) : '';
  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, 1000) : undefined;

  let platforms: string[] | undefined;
  if (Array.isArray(body.platforms)) {
    platforms = body.platforms
      .filter((p: unknown): p is string => typeof p === 'string' && VALID_PLATFORMS.includes(p))
      .slice(0, VALID_PLATFORMS.length);
  }

  const budget =
    typeof body.budget === 'string' && VALID_BUDGETS.includes(body.budget as never)
      ? (body.budget as 'low' | 'medium' | 'high')
      : undefined;

  let goals: string[] | undefined;
  if (Array.isArray(body.goals)) {
    goals = body.goals
      .filter((g: unknown): g is string => typeof g === 'string' && VALID_GOALS.includes(g))
      .slice(0, VALID_GOALS.length);
  }

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdFormatOptimizerInput = {
    productOrBrand,
    targetAudience,
    platforms,
    budget,
    goals,
    dryRun,
  };

  const validation = validateAdFormatOptimizerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_FORMAT_OPTIMIZER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-format-optimizer');
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
    const result = await optimizeFormat(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-format-optimizer').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-format-optimizer', 'optimize_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
