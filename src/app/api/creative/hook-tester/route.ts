import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  HOOK_TESTER_CREDIT_COST,
  testHooks,
  validateHookTesterInput,
  VALID_PLATFORMS,
  MIN_HOOKS,
  MAX_HOOKS,
  MAX_HOOK_LENGTH,
  type HookTesterInput,
} from '@/lib/creative/hook-tester';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/hook-tester
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'hook-tester',
    creditCost: HOOK_TESTER_CREDIT_COST,
    schema: {
      input: {
        hooks: `string[] (required, ${MIN_HOOKS}-${MAX_HOOKS} items, each max ${MAX_HOOK_LENGTH} chars)`,
        productOrBrand: 'string (required, max 2000 chars)',
        targetAudience: 'string (optional, max 1000 chars)',
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        rankedHooks: 'HookTestResult[]',
        bestPick: 'string',
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
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, 2000) : '';

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, 1000) : undefined;

  let hooks: string[] | undefined;
  if (Array.isArray(body.hooks)) {
    hooks = body.hooks
      .filter((h: unknown): h is string => typeof h === 'string')
      .map((h: string) => h.slice(0, MAX_HOOK_LENGTH))
      .slice(0, MAX_HOOKS);
  }

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: HookTesterInput = {
    hooks: hooks || [],
    productOrBrand,
    targetAudience,
    platform,
    dryRun,
  };

  const validation = validateHookTesterInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = HOOK_TESTER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:hook-tester');
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
    const result = await testHooks(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:hook-tester').catch(() => {});
    const safe = safeError(e, 'creative/hook-tester', 'test_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
