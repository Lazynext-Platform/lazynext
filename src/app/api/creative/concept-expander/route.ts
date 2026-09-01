import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CONCEPT_EXPANDER_CREDIT_COST,
  expandConcepts,
  validateConceptExpanderInput,
  VALID_PLATFORMS,
  VALID_DIFFICULTIES,
  MAX_SEED_CONCEPT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_TARGET_AUDIENCE_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type ConceptExpanderInput,
} from '@/lib/creative/concept-expander';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/concept-expander
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'concept-expander',
    creditCost: CONCEPT_EXPANDER_CREDIT_COST,
    schema: {
      input: {
        seedConcept: `string (required, max ${MAX_SEED_CONCEPT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (optional, max ${MAX_TARGET_AUDIENCE_LENGTH} chars)`,
        count: `number (optional, ${MIN_COUNT}-${MAX_COUNT}, default ${DEFAULT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        concepts: 'ExpandedConcept[]',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      difficulties: VALID_DIFFICULTIES,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const seedConcept =
    typeof body.seedConcept === 'string' ? body.seedConcept.trim().slice(0, MAX_SEED_CONCEPT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_TARGET_AUDIENCE_LENGTH) : undefined;

  const count =
    typeof body.count === 'number' && Number.isFinite(body.count)
      ? Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(body.count)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: ConceptExpanderInput = {
    seedConcept,
    platform,
    productOrBrand,
    targetAudience,
    count,
    dryRun,
  };

  const validation = validateConceptExpanderInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CONCEPT_EXPANDER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:concept-expander');
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
    const result = await expandConcepts(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:concept-expander').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/concept-expander', 'expand_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
