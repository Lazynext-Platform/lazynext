import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_LIFECYCLE_MANAGER_CREDIT_COST,
  generateLifecycleAnalysis,
  validateAdCreativeLifecycleManagerInput,
  VALID_PLATFORMS,
  VALID_STAGES,
  VALID_HEALTH,
  DEFAULT_STAGE,
  MAX_PRODUCT_LENGTH,
  MAX_CREATIVE_LENGTH,
  type AdCreativeLifecycleManagerInput,
} from '@/lib/creative/ad-creative-lifecycle-manager';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-lifecycle-manager
 * Returns the credit cost, schema info, and supported platforms/stages/
 * health indicators (no auth required for catalog metadata — same
 * pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-lifecycle-manager',
    creditCost: AD_CREATIVE_LIFECYCLE_MANAGER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        creativeDescription: `string (required, max ${MAX_CREATIVE_LENGTH} chars)`,
        currentStage: `string (optional: ${VALID_STAGES.join(', ')} — default ${DEFAULT_STAGE})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        lifecycle: 'LifecycleResult.lifecycle',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      stages: VALID_STAGES,
      health: VALID_HEALTH,
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

  const creativeDescription =
    typeof body.creativeDescription === 'string' ? body.creativeDescription.trim().slice(0, MAX_CREATIVE_LENGTH) : '';

  const currentStage =
    typeof body.currentStage === 'string' && VALID_STAGES.includes(body.currentStage as never)
      ? body.currentStage
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeLifecycleManagerInput = {
    productOrBrand,
    creativeDescription,
    currentStage,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeLifecycleManagerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_LIFECYCLE_MANAGER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-lifecycle-manager');
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
    const result = await generateLifecycleAnalysis(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-lifecycle-manager').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-lifecycle-manager', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
