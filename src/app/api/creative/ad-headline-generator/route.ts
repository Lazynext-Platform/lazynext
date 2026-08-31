import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_HEADLINE_GENERATOR_CREDIT_COST,
  generateAdHeadlines,
  validateAdHeadlineGeneratorInput,
  VALID_PLATFORMS,
  VALID_HOOK_TYPES,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_TONE_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdHeadlineGeneratorInput,
} from '@/lib/creative/ad-headline-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-headline-generator
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-headline-generator',
    creditCost: AD_HEADLINE_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        targetAudience: `string (optional, max ${MAX_AUDIENCE_LENGTH} chars)`,
        tone: `string (optional, max ${MAX_TONE_LENGTH} chars)`,
        count: `number (optional, ${MIN_COUNT}-${MAX_COUNT}, default ${DEFAULT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        headlines: 'AdHeadline[]',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      hookTypes: VALID_HOOK_TYPES,
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

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : undefined;

  const tone =
    typeof body.tone === 'string' ? body.tone.trim().slice(0, MAX_TONE_LENGTH) : undefined;

  let count: number | undefined;
  if (typeof body.count === 'number' && Number.isFinite(body.count)) {
    count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(body.count)));
  }

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdHeadlineGeneratorInput = {
    productOrBrand,
    platform,
    targetAudience,
    tone,
    count,
    dryRun,
  };

  const validation = validateAdHeadlineGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_HEADLINE_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-headline-generator');
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
    const result = await generateAdHeadlines(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-headline-generator').catch(() => {});
    const safe = safeError(e, 'creative/ad-headline-generator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
