import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_CONCEPT_VALIDATOR_CREDIT_COST,
  validateConcept,
  validateCreativeConceptValidatorInput,
  VALID_PLATFORMS,
  VALID_SEVERITIES,
  MAX_CONCEPT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeConceptValidatorInput,
} from '@/lib/creative/creative-concept-validator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-concept-validator
 * Returns the credit cost, schema info, and supported platforms/severities
 * (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-concept-validator',
    creditCost: CREATIVE_CONCEPT_VALIDATOR_CREDIT_COST,
    schema: {
      input: {
        concept: `string (required, max ${MAX_CONCEPT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: `string (optional: ${VALID_PLATFORMS.join(', ')})`,
        targetAudience: `string (optional, max ${MAX_AUDIENCE_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        validation: 'ConceptValidation',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      severities: VALID_SEVERITIES,
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

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeConceptValidatorInput = {
    concept,
    productOrBrand,
    platform,
    targetAudience,
    dryRun,
  };

  const validation = validateCreativeConceptValidatorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_CONCEPT_VALIDATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-concept-validator');
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
    const result = await validateConcept(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-concept-validator').catch(() => {});
    const safe = safeError(e, 'creative/creative-concept-validator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
