import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getUserPlanTier } from '@/lib/plan-tier';
import {
  analyzeMatrix,
  identifyWinningCombinations,
  analyzeDimensions,
  generateMatrixInsights,
  type VariantMatrix,
} from '@/lib/creative/variant-matrix';

export const maxDuration = 60;

/**
 * POST /api/creative/variant-matrix/analyze
 * Body: { matrix?: VariantMatrix, matrixId?: string }
 * Runs the full analysis pipeline (winning combinations, dimension analysis,
 * insights) and returns a MatrixResult.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  await getUserPlanTier(uid); // plan-tier aware routing

  const body = await req.json().catch(() => ({}));
  const matrix = body.matrix as VariantMatrix | undefined;

  if (!matrix || !Array.isArray(matrix.cells)) {
    // If only a matrixId is provided we cannot resolve it server-side yet
    // (matrices are client-cached in this iteration).
    return NextResponse.json({ error: 'matrix_required' }, { status: 400 });
  }

  // Full analysis path.
  const result = analyzeMatrix(matrix);

  // The individual functions are also exposed for callers that want them,
  // but the unified MatrixResult already aggregates their output.
  void identifyWinningCombinations;
  void analyzeDimensions;
  void generateMatrixInsights;

  return NextResponse.json({ result });
}

export const POST = withAtlas(__byokPOST);
