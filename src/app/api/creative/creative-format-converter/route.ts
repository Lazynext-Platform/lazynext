import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_FORMAT_CONVERTER_CREDIT_COST,
  convertFormat,
  validateCreativeFormatConverterInput,
  VALID_PLATFORMS,
  VALID_FORMATS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeFormatConverterInput,
  type AdFormat,
} from '@/lib/creative/creative-format-converter';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-format-converter
 * Returns the credit cost, schema info, and supported platforms/formats (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-format-converter',
    creditCost: CREATIVE_FORMAT_CONVERTER_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        sourceFormat: `string (required: ${VALID_FORMATS.join(', ')})`,
        targetFormat: `string (required: ${VALID_FORMATS.join(', ')})`,
        platform: `string (optional: ${VALID_PLATFORMS.join(', ')})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        conversion: 'FormatConversion',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      formats: VALID_FORMATS,
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

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const sourceFormat =
    typeof body.sourceFormat === 'string' && VALID_FORMATS.includes(body.sourceFormat as AdFormat)
      ? (body.sourceFormat as AdFormat)
      : '';

  const targetFormat =
    typeof body.targetFormat === 'string' && VALID_FORMATS.includes(body.targetFormat as AdFormat)
      ? (body.targetFormat as AdFormat)
      : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeFormatConverterInput = {
    content,
    productOrBrand,
    sourceFormat: sourceFormat as AdFormat,
    targetFormat: targetFormat as AdFormat,
    platform,
    dryRun,
  };

  const validation = validateCreativeFormatConverterInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_FORMAT_CONVERTER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-format-converter');
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
    const result = await convertFormat(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-format-converter').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/creative-format-converter', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
