import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_HOOK_MATRIX_GENERATOR_CREDIT_COST,
  generateHookMatrix,
  validateHookMatrixGeneratorInput,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MIN_HOOK_COUNT,
  MAX_HOOK_COUNT,
  DEFAULT_HOOK_COUNT,
  type HookMatrixGeneratorInput,
} from '@/lib/creative/creative-hook-matrix-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-hook-matrix-generator
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-hook-matrix-generator',
    creditCost: CREATIVE_HOOK_MATRIX_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        audience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        hookCount: `number (optional, ${MIN_HOOK_COUNT}-${MAX_HOOK_COUNT}, default ${DEFAULT_HOOK_COUNT})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        matrix: 'HookMatrix',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
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

  const audience =
    typeof body.audience === 'string' ? body.audience.trim().slice(0, MAX_AUDIENCE_LENGTH) : '';

  const hookCount =
    typeof body.hookCount === 'number' && Number.isFinite(body.hookCount)
      ? Math.max(MIN_HOOK_COUNT, Math.min(MAX_HOOK_COUNT, Math.round(body.hookCount)))
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: HookMatrixGeneratorInput = {
    productOrBrand,
    audience,
    hookCount,
    platform,
    dryRun,
  };

  const validation = validateHookMatrixGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_HOOK_MATRIX_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-hook-matrix-generator');
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
    const result = await generateHookMatrix(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-hook-matrix-generator').catch(() => {});
    const safe = safeError(e, 'creative/creative-hook-matrix-generator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
