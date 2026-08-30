import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generatePersonas,
  validateAudiencePersonaGeneratorInput,
  AUDIENCE_PERSONA_GENERATOR_CREDIT_COST,
  VALID_INDUSTRIES,
  INDUSTRY_LABELS,
  type AudiencePersonaGeneratorInput,
  type Industry,
} from '@/lib/creative/audience-persona-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/audience-persona-generator
 * Returns the credit cost, schema info, and available industries (no auth
 * required for catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: AUDIENCE_PERSONA_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: 'string (required, max 2000 chars)',
        industry: 'Industry (optional)',
        targetMarket: 'string (optional)',
        dryRun: 'boolean (optional)',
      },
      output: {
        personas: 'AudiencePersona[]',
        dryRun: 'boolean',
      },
    },
    industries: VALID_INDUSTRIES,
    industryLabels: INDUSTRY_LABELS,
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

  const industry =
    typeof body.industry === 'string' && VALID_INDUSTRIES.includes(body.industry as Industry)
      ? (body.industry as Industry)
      : undefined;

  const targetMarket =
    typeof body.targetMarket === 'string' && body.targetMarket.trim()
      ? body.targetMarket.trim().slice(0, 500)
      : undefined;

  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AudiencePersonaGeneratorInput = {
    productOrBrand,
    industry,
    targetMarket,
    dryRun,
  };

  const validation = validateAudiencePersonaGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, AUDIENCE_PERSONA_GENERATOR_CREDIT_COST, 'creative:audience-persona-generator');
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
    const result = await generatePersonas(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, AUDIENCE_PERSONA_GENERATOR_CREDIT_COST, 'creative:audience-persona-generator');
    return NextResponse.json(safeError(e, 'creative/audience-persona-generator', 'persona_generation_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
