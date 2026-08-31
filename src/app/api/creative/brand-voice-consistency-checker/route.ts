import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  BRAND_VOICE_CONSISTENCY_CHECKER_CREDIT_COST,
  checkBrandVoiceConsistency,
  validateBrandVoiceConsistencyCheckerInput,
  VALID_PLATFORMS,
  VALID_GRADES,
  VALID_STATUSES,
  VALID_SEVERITIES,
  MAX_CONTENT_LENGTH,
  MAX_BRAND_NAME_LENGTH,
  MAX_VOICE_DESCRIPTION_LENGTH,
  type BrandVoiceConsistencyCheckerInput,
} from '@/lib/creative/brand-voice-consistency-checker';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/brand-voice-consistency-checker
 * Returns the credit cost, schema info, and supported platforms/grades/
 * statuses/severities (no auth required for catalog metadata — same pattern
 * as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'brand-voice-consistency-checker',
    creditCost: BRAND_VOICE_CONSISTENCY_CHECKER_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        brandName: `string (required, max ${MAX_BRAND_NAME_LENGTH} chars)`,
        brandVoiceDescription: `string (required, max ${MAX_VOICE_DESCRIPTION_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        check: 'VoiceConsistencyCheck',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      grades: VALID_GRADES,
      statuses: VALID_STATUSES,
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

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const brandName =
    typeof body.brandName === 'string' ? body.brandName.trim().slice(0, MAX_BRAND_NAME_LENGTH) : '';

  const brandVoiceDescription =
    typeof body.brandVoiceDescription === 'string'
      ? body.brandVoiceDescription.trim().slice(0, MAX_VOICE_DESCRIPTION_LENGTH)
      : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: BrandVoiceConsistencyCheckerInput = {
    content,
    brandName,
    brandVoiceDescription,
    platform,
    dryRun,
  };

  const validation = validateBrandVoiceConsistencyCheckerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = BRAND_VOICE_CONSISTENCY_CHECKER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:brand-voice-consistency-checker');
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
    const result = await checkBrandVoiceConsistency(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:brand-voice-consistency-checker').catch(() => {});
    const safe = safeError(e, 'creative/brand-voice-consistency-checker', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
