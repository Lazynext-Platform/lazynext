import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateAdCopy,
  validateAdCopyInput,
  AD_COPY_GENERATOR_CREDIT_COST,
  type AdCopyGeneratorInput,
  type AdCopyPlatform,
  type AdCopyBrandKit,
} from '@/lib/creative/ad-copy-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-copy-generator
 * Returns the credit cost and the input/output schema (no auth required for
 * catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: AD_COPY_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        source: 'string (required — product URL or brief text)',
        platform: 'AdCopyPlatform (required — tiktok | instagram | youtube)',
        brandKit: 'AdCopyBrandKit (optional)',
        dryRun: 'boolean (optional)',
      },
      output: {
        platform: 'AdCopyPlatform',
        headline: 'string',
        bodyCopy: 'string',
        cta: 'string',
        hashtags: 'string[]',
        description: 'string',
      },
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const source =
    typeof body.source === 'string' ? body.source.trim().slice(0, 10000) : '';
  if (!source) {
    return NextResponse.json({ error: 'source_required' }, { status: 400 });
  }

  const platform =
    body.platform === 'tiktok' || body.platform === 'instagram' || body.platform === 'youtube'
      ? (body.platform as AdCopyPlatform)
      : '';
  if (!platform) {
    return NextResponse.json({ error: 'platform_invalid' }, { status: 400 });
  }

  const brandKit =
    body.brandKit && typeof body.brandKit === 'object' ? (body.brandKit as AdCopyBrandKit) : undefined;

  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCopyGeneratorInput = {
    source,
    platform,
    brandKit,
    dryRun,
  };

  const validation = validateAdCopyInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, AD_COPY_GENERATOR_CREDIT_COST, 'creative:ad-copy-generator');
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
    const result = await generateAdCopy(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, AD_COPY_GENERATOR_CREDIT_COST, 'creative:ad-copy-generator');
    const { error, status } = safeAtlasError(e, 'creative/ad-copy-generator', 'ad_copy_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
