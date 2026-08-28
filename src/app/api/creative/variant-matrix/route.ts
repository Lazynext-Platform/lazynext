import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';
import {
  createMatrix,
  validateMatrixConfig,
  calculateMatrixSize,
  MATRIX_COST_PER_CELL,
  MATRIX_MAX_CELLS,
  type AdFormat,
  type MatrixAxis,
} from '@/lib/creative/variant-matrix';

export const maxDuration = 60;

const VALID_FORMATS: AdFormat[] = [
  'video_vertical',
  'video_horizontal',
  'video_square',
  'image_single',
  'image_carousel',
  'story',
  'reel',
  'short',
];

/**
 * POST /api/creative/variant-matrix
 * Body: { name, hooks[], angles[], formats[], platforms[], tones?, ctas? }
 * Deducts 1 credit per generated cell.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  await getUserPlanTier(uid); // plan-tier aware routing (tier available for future model selection)

  const body = await req.json().catch(() => ({}));

  // Normalize formats to AdFormat[].
  const rawFormats = Array.isArray(body.formats) ? body.formats : [];
  const formats: AdFormat[] = rawFormats
    .filter((f: unknown): f is AdFormat => typeof f === 'string' && (VALID_FORMATS as string[]).includes(f))
    .map((f: AdFormat) => f);

  const config: Record<string, unknown> = {
    name: body.name,
    hooks: body.hooks,
    angles: body.angles,
    formats,
    platforms: body.platforms,
    tones: body.tones,
    ctas: body.ctas,
  };

  const validation = validateMatrixConfig(config);
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_config', details: validation.errors }, { status: 400 });
  }

  // Compute total cells for credit deduction.
  const axes: MatrixAxis[] = [
    { dimension: 'hook', values: body.hooks as string[] },
    { dimension: 'angle', values: body.angles as string[] },
    { dimension: 'format', values: formats },
    { dimension: 'platform', values: body.platforms as string[] },
  ];
  if (Array.isArray(body.tones) && body.tones.length > 0) axes.push({ dimension: 'tone', values: body.tones });
  if (Array.isArray(body.ctas) && body.ctas.length > 0) axes.push({ dimension: 'cta', values: body.ctas });

  const totalCells = calculateMatrixSize(axes);
  if (totalCells > MATRIX_MAX_CELLS) {
    return NextResponse.json(
      { error: 'too_many_cells', detail: `Matrix has ${totalCells} cells, max is ${MATRIX_MAX_CELLS}` },
      { status: 400 },
    );
  }

  const cost = totalCells * MATRIX_COST_PER_CELL;

  try {
    await deductCredits(uid, cost, 'creative:variant-matrix');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const matrix = createMatrix({
      name: String(body.name),
      hooks: body.hooks as string[],
      angles: body.angles as string[],
      formats,
      platforms: body.platforms as string[],
      tones: Array.isArray(body.tones) ? (body.tones as string[]) : undefined,
      ctas: Array.isArray(body.ctas) ? (body.ctas as string[]) : undefined,
    });
    return NextResponse.json({ matrix });
  } catch (e) {
    await refundSync(uid, cost, 'creative:variant-matrix');
    console.error('[creative/variant-matrix] error:', String(e));
    return NextResponse.json({ error: 'matrix_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
