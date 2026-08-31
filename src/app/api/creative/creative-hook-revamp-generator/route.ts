import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_HOOK_REVAMP_GENERATOR_CREDIT_COST,
  generateHookRevamps,
  validateCreativeHookRevampGeneratorInput,
  VALID_PLATFORMS,
  VALID_REVAMP_STYLES,
  MAX_HOOK_LENGTH,
  MAX_PRODUCT_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type CreativeHookRevampGeneratorInput,
} from '@/lib/creative/creative-hook-revamp-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-hook-revamp-generator
 * Returns the credit cost, schema info, and supported platforms/styles (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-hook-revamp-generator',
    creditCost: CREATIVE_HOOK_REVAMP_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        originalHook: `string (required, max ${MAX_HOOK_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: `string (optional: ${VALID_PLATFORMS.join(', ')})`,
        revampStyle: `string (optional: ${VALID_REVAMP_STYLES.join(', ')})`,
        count: `number (optional, ${MIN_COUNT}-${MAX_COUNT}, default ${DEFAULT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        revamps: 'HookRevamp[]',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      revampStyles: VALID_REVAMP_STYLES,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const originalHook =
    typeof body.originalHook === 'string' ? body.originalHook.trim().slice(0, MAX_HOOK_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const revampStyle =
    typeof body.revampStyle === 'string' && VALID_REVAMP_STYLES.includes(body.revampStyle as never)
      ? body.revampStyle
      : undefined;

  const count =
    typeof body.count === 'number' && Number.isFinite(body.count)
      ? Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(body.count)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeHookRevampGeneratorInput = {
    originalHook,
    productOrBrand,
    platform,
    revampStyle,
    count,
    dryRun,
  };

  const validation = validateCreativeHookRevampGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_HOOK_REVAMP_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-hook-revamp-generator');
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
    const result = await generateHookRevamps(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-hook-revamp-generator').catch(() => {});
    const safe = safeError(e, 'creative/creative-hook-revamp-generator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
