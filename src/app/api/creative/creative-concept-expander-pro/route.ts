import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_CONCEPT_EXPANDER_PRO_CREDIT_COST,
  generateConceptExpansion,
  validateCreativeConceptExpanderProInput,
  VALID_PLATFORMS,
  VALID_EXPANSION_DEPTHS,
  DEFAULT_EXPANSION_DEPTH,
  MAX_CONCEPT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeConceptExpanderProInput,
} from '@/lib/creative/creative-concept-expander-pro';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-concept-expander-pro
 * Returns the credit cost, schema info, and supported platforms/depths (no
 * auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-concept-expander-pro',
    creditCost: CREATIVE_CONCEPT_EXPANDER_PRO_CREDIT_COST,
    schema: {
      input: {
        concept: `string (required, max ${MAX_CONCEPT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        expansionDepth: `string (optional: shallow, standard, deep — default ${DEFAULT_EXPANSION_DEPTH})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        expansion: 'ConceptExpansion',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      expansionDepths: VALID_EXPANSION_DEPTHS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const concept =
    typeof body.concept === 'string' ? body.concept.trim().slice(0, MAX_CONCEPT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const expansionDepth =
    typeof body.expansionDepth === 'string' && VALID_EXPANSION_DEPTHS.includes(body.expansionDepth as never)
      ? body.expansionDepth
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeConceptExpanderProInput = {
    concept,
    productOrBrand,
    expansionDepth,
    platform,
    dryRun,
  };

  const validation = validateCreativeConceptExpanderProInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_CONCEPT_EXPANDER_PRO_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-concept-expander-pro');
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
    const result = await generateConceptExpansion(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-concept-expander-pro').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/creative-concept-expander-pro', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
