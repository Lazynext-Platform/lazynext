import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateHooks,
  getHooks,
  validateHookLibraryInput,
  HOOK_LIBRARY_CREDIT_COST,
  type HookLibraryInput,
  type EmotionalTrigger,
  type Platform,
} from '@/lib/creative/hook-library';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/hook-library
 * Returns the credit cost and schema info (public catalog metadata). When the
 * caller is authenticated, also returns their stored hooks (with optional
 * query-param filtering). Hooks are scoped to the authenticated user — a
 * caller can only ever retrieve their own hooks (ownership enforced in
 * `getHooks` via the userId query).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const trigger = url.searchParams.get('trigger') as EmotionalTrigger | null;
  const platform = url.searchParams.get('platform') as Platform | null;
  const minScoreRaw = url.searchParams.get('minScore');
  const minScore = minScoreRaw ? Number(minScoreRaw) : undefined;

  // Catalog metadata is public; hooks require an authenticated session.
  const session = await auth();
  const uid = session?.user?.id;

  const hooks = uid
    ? await getHooks(uid, {
        trigger: trigger || undefined,
        platform: platform || undefined,
        minScore,
      })
    : undefined;

  return NextResponse.json({
    creditCost: HOOK_LIBRARY_CREDIT_COST,
    retrievalCost: 0,
    schema: {
      input: {
        productOrBrand: 'string (required)',
        audience: 'string (optional)',
        triggers: 'EmotionalTrigger[] (optional)',
        platforms: 'Platform[] (optional)',
        count: 'number (optional, 1-50)',
        dryRun: 'boolean (optional)',
      },
      output: {
        hooks: 'Hook[]',
        generated: 'number',
        stored: 'number',
      },
    },
    ...(hooks ? { hooks } : {}),
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
  if (!productOrBrand) {
    return NextResponse.json({ error: 'product_or_brand_required' }, { status: 400 });
  }

  const audience =
    typeof body.audience === 'string' && body.audience.trim()
      ? body.audience.trim().slice(0, 1000)
      : undefined;

  const triggers = Array.isArray(body.triggers) ? body.triggers : undefined;
  const platforms = Array.isArray(body.platforms) ? body.platforms : undefined;
  const count =
    typeof body.count === 'number' && Number.isFinite(body.count) ? Math.round(body.count) : undefined;
  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: HookLibraryInput = {
    productOrBrand,
    audience,
    triggers,
    platforms,
    count,
    dryRun,
  };

  const validation = validateHookLibraryInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, HOOK_LIBRARY_CREDIT_COST, 'creative:hook-library');
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
    const result = await generateHooks(input, uid, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, HOOK_LIBRARY_CREDIT_COST, 'creative:hook-library');
    return NextResponse.json(safeError(e, 'creative/hook-library', 'hook_library_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
