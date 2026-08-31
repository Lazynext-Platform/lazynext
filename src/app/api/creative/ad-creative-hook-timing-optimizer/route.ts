import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_HOOK_TIMING_OPTIMIZER_CREDIT_COST,
  generateHookTimingOptimization,
  validateAdCreativeHookTimingOptimizerInput,
  VALID_PLATFORMS,
  VALID_HOOK_TYPES,
  VALID_RETENTION_RISKS,
  DEFAULT_HOOK_TYPE,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdCreativeHookTimingOptimizerInput,
} from '@/lib/creative/ad-creative-hook-timing-optimizer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-hook-timing-optimizer
 * Returns the credit cost, schema info, and supported platforms/hook types/
 * retention risks (no auth required for catalog metadata — same pattern as
 * other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-hook-timing-optimizer',
    creditCost: AD_CREATIVE_HOOK_TIMING_OPTIMIZER_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        hookType: `string (optional: ${VALID_HOOK_TYPES.join(', ')} — default ${DEFAULT_HOOK_TYPE})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        timing: 'HookTiming',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      hookTypes: VALID_HOOK_TYPES,
      retentionRisks: VALID_RETENTION_RISKS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string'
      ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH)
      : '';

  const hookType =
    typeof body.hookType === 'string' && VALID_HOOK_TYPES.includes(body.hookType as never)
      ? body.hookType
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeHookTimingOptimizerInput = {
    content,
    productOrBrand,
    hookType,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeHookTimingOptimizerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_HOOK_TIMING_OPTIMIZER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-hook-timing-optimizer');
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
    const result = await generateHookTimingOptimization(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-hook-timing-optimizer').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-hook-timing-optimizer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
