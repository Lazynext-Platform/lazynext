import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_AD_CONCEPT_SYNTHESIZER_CREDIT_COST,
  generateConceptSynthesis,
  validateCreativeAdConceptSynthesizerInput,
  VALID_PLATFORMS,
  MAX_CONCEPT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_CONCEPTS,
  type CreativeAdConceptSynthesizerInput,
} from '@/lib/creative/creative-ad-concept-synthesizer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-ad-concept-synthesizer
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-ad-concept-synthesizer',
    creditCost: CREATIVE_AD_CONCEPT_SYNTHESIZER_CREDIT_COST,
    schema: {
      input: {
        concepts: `string[] or newline-separated string (required, max ${MAX_CONCEPTS} concepts, each max ${MAX_CONCEPT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        synthesis: 'ConceptSynthesis',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      maxConcepts: MAX_CONCEPTS,
      maxConceptLength: MAX_CONCEPT_LENGTH,
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

  // concepts: accept string (newline-separated) or string[]
  let concepts: string[] | string | undefined;
  if (typeof body.concepts === 'string') {
    concepts = body.concepts;
  } else if (Array.isArray(body.concepts)) {
    concepts = body.concepts
      .filter((c: unknown) => typeof c === 'string')
      .map((c: string) => c.trim().slice(0, MAX_CONCEPT_LENGTH))
      .filter((c: string) => c.length > 0)
      .slice(0, MAX_CONCEPTS);
  }

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeAdConceptSynthesizerInput = {
    concepts: concepts as string[] | string,
    productOrBrand,
    platform,
    dryRun,
  };

  const validation = validateCreativeAdConceptSynthesizerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_AD_CONCEPT_SYNTHESIZER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-ad-concept-synthesizer');
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
    const result = await generateConceptSynthesis(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-ad-concept-synthesizer').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/creative-ad-concept-synthesizer', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
