import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  BRAND_VOICE_ANALYZER_CREDIT_COST,
  analyzeBrandVoice,
  validateBrandVoiceAnalyzerInput,
  VALID_TONES,
  MAX_BRAND_NAME_LENGTH,
  MIN_SAMPLE_LENGTH,
  MAX_SAMPLE_LENGTH,
  type BrandVoiceAnalyzerInput,
} from '@/lib/creative/brand-voice-analyzer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/brand-voice-analyzer
 * Returns the credit cost, schema info, and supported tones (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'brand-voice-analyzer',
    creditCost: BRAND_VOICE_ANALYZER_CREDIT_COST,
    schema: {
      input: {
        brandName: `string (required, max ${MAX_BRAND_NAME_LENGTH} chars)`,
        sampleContent: `string (required, min ${MIN_SAMPLE_LENGTH} chars, max ${MAX_SAMPLE_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        voiceProfile: 'VoiceProfile',
        brandName: 'string',
        dryRun: 'boolean',
      },
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

  const brandName =
    typeof body.brandName === 'string' ? body.brandName.trim().slice(0, MAX_BRAND_NAME_LENGTH) : '';

  const sampleContent =
    typeof body.sampleContent === 'string' ? body.sampleContent.slice(0, MAX_SAMPLE_LENGTH) : '';

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: BrandVoiceAnalyzerInput = {
    brandName,
    sampleContent,
    dryRun,
  };

  const validation = validateBrandVoiceAnalyzerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = BRAND_VOICE_ANALYZER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:brand-voice-analyzer');
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
    const result = await analyzeBrandVoice(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:brand-voice-analyzer').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/brand-voice-analyzer', 'analyze_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
