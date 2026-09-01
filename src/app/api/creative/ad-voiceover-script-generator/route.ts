import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_VOICEOVER_SCRIPT_GENERATOR_CREDIT_COST,
  generateVoiceoverScript,
  validateAdVoiceoverScriptGeneratorInput,
  VALID_PLATFORMS,
  VALID_TONES,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MIN_DURATION,
  MAX_DURATION,
  DEFAULT_DURATION,
  type AdVoiceoverScriptGeneratorInput,
} from '@/lib/creative/ad-voiceover-script-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-voiceover-script-generator
 * Returns the credit cost, schema info, and supported platforms/tones (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-voiceover-script-generator',
    creditCost: AD_VOICEOVER_SCRIPT_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        tone: 'string (optional: friendly, professional, energetic, calm, authoritative, conversational)',
        duration: `number (optional, ${MIN_DURATION}-${MAX_DURATION} seconds, default ${DEFAULT_DURATION})`,
        targetAudience: `string (optional, max ${MAX_AUDIENCE_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        script: 'VoiceoverScript',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      tones: VALID_TONES,
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

  const tone =
    typeof body.tone === 'string' && VALID_TONES.includes(body.tone as never)
      ? body.tone
      : undefined;

  const duration =
    typeof body.duration === 'number' && Number.isFinite(body.duration)
      ? Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(body.duration)))
      : undefined;

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdVoiceoverScriptGeneratorInput = {
    productOrBrand,
    platform,
    tone,
    duration,
    targetAudience,
    dryRun,
  };

  const validation = validateAdVoiceoverScriptGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_VOICEOVER_SCRIPT_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-voiceover-script-generator');
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
    const result = await generateVoiceoverScript(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-voiceover-script-generator').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-voiceover-script-generator', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
