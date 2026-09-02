import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateVariantMatrix,
  validateVariantMatrixGeneratorInput,
  VARIANT_MATRIX_GENERATOR_CREDIT_COST,
  type VariantMatrixGeneratorInput,
  type MatrixDimension,
} from '@/lib/creative/variant-matrix-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

const AVAILABLE_DIMENSIONS: MatrixDimension[] = ['hook', 'angle', 'format', 'platform'];

/**
 * GET /api/creative/variant-matrix-generator
 * Returns the credit cost, schema info, and available dimensions.
 * No auth required for catalog metadata.
 */
export async function GET() {
  return NextResponse.json({
    creditCost: VARIANT_MATRIX_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: 'string (required, max 2000 chars)',
        dimensions: 'MatrixDimension[] (optional: hook|angle|format|platform)',
        platforms: 'string[] (optional)',
        count: 'number (optional, 1-20)',
        dryRun: 'boolean (optional)',
      },
      output: {
        variants: 'MatrixVariant[]',
        dimensions: 'MatrixDimension[]',
        dryRun: 'boolean',
      },
    },
    availableDimensions: AVAILABLE_DIMENSIONS,
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

  const dimensions = Array.isArray(body.dimensions) ? body.dimensions : undefined;
  const platforms = Array.isArray(body.platforms) ? body.platforms : undefined;
  const count =
    typeof body.count === 'number' && Number.isFinite(body.count) ? Math.round(body.count) : undefined;
  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: VariantMatrixGeneratorInput = {
    productOrBrand,
    dimensions,
    platforms,
    count,
    dryRun,
  };

  const validation = validateVariantMatrixGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, VARIANT_MATRIX_GENERATOR_CREDIT_COST, 'creative:variant-matrix-generator');
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
    const result = await generateVariantMatrix(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, VARIANT_MATRIX_GENERATOR_CREDIT_COST, 'creative:variant-matrix-generator');
    const { error, status } = safeAtlasError(e, 'creative/variant-matrix-generator', 'variant_matrix_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
