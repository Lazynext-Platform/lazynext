import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_SOCIAL_PROOF_ARCHITECT_CREDIT_COST,
  generateSocialProofArchitecture,
  validateAdCreativeSocialProofArchitectInput,
  VALID_PLATFORMS,
  VALID_PROOF_TYPES,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_CONTENT_LENGTH,
  type AdCreativeSocialProofArchitectInput,
} from '@/lib/creative/ad-creative-social-proof-architect';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-social-proof-architect
 * Returns the credit cost, schema info, and supported platforms/proof types/
 * impacts (no auth required for catalog metadata — same pattern as other
 * creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-social-proof-architect',
    creditCost: AD_CREATIVE_SOCIAL_PROOF_ARCHITECT_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        architecture: 'ProofArchitecture',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      proofTypes: VALID_PROOF_TYPES,
      impacts: VALID_IMPACTS,
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

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : '';

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeSocialProofArchitectInput = {
    productOrBrand,
    targetAudience,
    content,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeSocialProofArchitectInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_SOCIAL_PROOF_ARCHITECT_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-social-proof-architect');
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
    const result = await generateSocialProofArchitecture(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-social-proof-architect').catch(() => {});
    const safe = safeError(e, 'creative/ad-creative-social-proof-architect', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
