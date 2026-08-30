import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  writeAdScript,
  validateAdScriptWriterInput,
  AD_SCRIPT_WRITER_CREDIT_COST,
  type AdScriptWriterInput,
  type AdScriptPlatform,
  type AdScriptBrandKit,
} from '@/lib/creative/ad-script-writer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

const SUPPORTED_PLATFORMS: AdScriptPlatform[] = ['tiktok', 'youtube', 'instagram'];

/**
 * GET /api/creative/ad-script-writer
 * Returns the credit cost, input/output schema, and supported platforms (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: AD_SCRIPT_WRITER_CREDIT_COST,
    supportedPlatforms: SUPPORTED_PLATFORMS,
    schema: {
      input: {
        source: 'string (required — product URL or brief text, max 2000 chars)',
        platform: 'AdScriptPlatform (required — tiktok | youtube | instagram)',
        durationSec: 'number (optional — 5-120 seconds)',
        brandKit: 'AdScriptBrandKit (optional)',
        dryRun: 'boolean (optional)',
      },
      output: {
        script: {
          scenes: 'AdScriptScene[]',
          totalDurationSec: 'number',
          platform: 'AdScriptPlatform',
          hook: 'string',
          cta: 'string',
        },
        dryRun: 'boolean',
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
    typeof body.source === 'string' ? body.source.trim().slice(0, 2000) : '';
  if (!source) {
    return NextResponse.json({ error: 'source_required' }, { status: 400 });
  }

  const platform =
    body.platform === 'tiktok' || body.platform === 'youtube' || body.platform === 'instagram'
      ? (body.platform as AdScriptPlatform)
      : '';
  if (!platform) {
    return NextResponse.json({ error: 'platform_invalid' }, { status: 400 });
  }

  const durationSec =
    typeof body.durationSec === 'number' && Number.isFinite(body.durationSec)
      ? body.durationSec
      : undefined;

  const brandKit =
    body.brandKit && typeof body.brandKit === 'object' ? (body.brandKit as AdScriptBrandKit) : undefined;

  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdScriptWriterInput = {
    source,
    platform,
    durationSec,
    brandKit,
    dryRun,
  };

  const validation = validateAdScriptWriterInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, AD_SCRIPT_WRITER_CREDIT_COST, 'creative:ad-script-writer');
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
    const result = await writeAdScript(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, AD_SCRIPT_WRITER_CREDIT_COST, 'creative:ad-script-writer');
    return NextResponse.json(safeError(e, 'creative/ad-script-writer', 'ad_script_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
