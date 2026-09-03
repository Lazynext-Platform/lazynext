import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateMultiConcept,
  validateMultiConceptInput,
  MULTI_CONCEPT_CREDIT_COST,
  EMOTIONAL_TRIGGERS,
  type MultiConceptInput,
} from '@/lib/creative/multi-concept';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { isUrlSafe, safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/multi-concept
 * Returns the credit cost and the emotional trigger schema (no auth required
 * for catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: MULTI_CONCEPT_CREDIT_COST,
    emotionalTriggers: EMOTIONAL_TRIGGERS.map((t) => ({
      trigger: t.trigger,
      name: t.name,
      description: t.description,
      hookSeed: t.hookSeed,
    })),
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

  const productUrl =
    typeof body.productUrl === 'string' && body.productUrl.trim() && isUrlSafe(body.productUrl)
      ? body.productUrl.trim().slice(0, 2048)
      : undefined;

  const audience =
    typeof body.audience === 'string' ? body.audience.trim().slice(0, 1000) : undefined;
  const platform =
    typeof body.platform === 'string' ? body.platform.trim().slice(0, 100) : undefined;

  let durationSeconds: number | undefined;
  if (body.durationSeconds !== undefined && body.durationSeconds !== null) {
    const d = Number(body.durationSeconds);
    durationSeconds = Number.isFinite(d) ? Math.max(3, Math.min(120, Math.round(d))) : undefined;
  }

  let brandInfo: MultiConceptInput['brandInfo'] | undefined;
  if (body.brandInfo && typeof body.brandInfo === 'object') {
    const bi = body.brandInfo as Record<string, unknown>;
    brandInfo = {
      name: typeof bi.name === 'string' ? bi.name.trim().slice(0, 200) : undefined,
      tone: typeof bi.tone === 'string' ? bi.tone.trim().slice(0, 200) : undefined,
      values:
        Array.isArray(bi.values)
          ? bi.values.filter((v): v is string => typeof v === 'string').map((v) => v.trim().slice(0, 200)).slice(0, 20)
          : undefined,
    };
  }

  const input: MultiConceptInput = {
    productOrBrand,
    productUrl,
    audience,
    platform,
    durationSeconds,
    brandInfo,
  };

  // Server-side validation (catches URL/numeric/shape issues).
  const validation = validateMultiConceptInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, MULTI_CONCEPT_CREDIT_COST, 'creative:multi-concept');
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
    const result = await generateMultiConcept(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, MULTI_CONCEPT_CREDIT_COST, 'creative:multi-concept');
    const { error, status } = safeAtlasError(e, 'creative/multi-concept', 'multi_concept_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
