import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_AD_FORMAT_INNOVATOR_CREDIT_COST,
  generateFormatInnovation,
  validateCreativeAdFormatInnovatorInput,
  VALID_PLATFORMS,
  VALID_DIFFICULTIES,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_FORMATS_LENGTH,
  MAX_FORMATS,
  type CreativeAdFormatInnovatorInput,
} from '@/lib/creative/creative-ad-format-innovator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-ad-format-innovator
 * Returns the credit cost, schema info, and supported platforms/difficulties/
 * impacts (no auth required for catalog metadata — same pattern as other
 * creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-ad-format-innovator',
    creditCost: CREATIVE_AD_FORMAT_INNOVATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetAudience: `string (required, max ${MAX_AUDIENCE_LENGTH} chars)`,
        currentFormats: `string (comma-separated) or string[] (optional, max ${MAX_FORMATS} entries, max ${MAX_FORMATS_LENGTH} chars total)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        innovation: 'FormatInnovation',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      difficulties: VALID_DIFFICULTIES,
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

  let currentFormats: string | string[] | undefined;
  if (Array.isArray(body.currentFormats)) {
    currentFormats = body.currentFormats
      .filter((x: unknown): x is string => typeof x === 'string')
      .map((x: string) => x.trim())
      .filter((x: string) => x.length > 0)
      .slice(0, MAX_FORMATS);
  } else if (typeof body.currentFormats === 'string') {
    currentFormats = body.currentFormats.trim().slice(0, MAX_FORMATS_LENGTH);
  }

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeAdFormatInnovatorInput = {
    productOrBrand,
    targetAudience,
    currentFormats,
    platform,
    dryRun,
  };

  const validation = validateCreativeAdFormatInnovatorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_AD_FORMAT_INNOVATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-ad-format-innovator');
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
    const result = await generateFormatInnovation(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-ad-format-innovator').catch(() => {});
    const safe = safeError(e, 'creative/creative-ad-format-innovator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
