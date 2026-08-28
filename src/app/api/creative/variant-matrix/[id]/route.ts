import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  analyzeMatrix,
  calculateCellScore,
  type VariantMatrix,
  type MatrixCell,
  type MatrixCellPerformance,
} from '@/lib/creative/variant-matrix';

export const maxDuration = 60;

/**
 * GET /api/creative/variant-matrix/[id]
 * Returns a matrix by id. Matrices are not persisted server-side in this
 * iteration — the client supplies the matrix id and the stored matrix is
 * expected to be cached client-side. This endpoint validates ownership of the
 * request and echoes back the matrix the client sends (via query or a future
 * persistence layer). For now it returns a not-implemented hint so the client
 * can fall back to its local cache.
 */
async function __byokGET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  // No server-side persistence yet; acknowledge the request with the id so the
  // client can reconcile its local cache.
  return NextResponse.json({ matrixId: id, persisted: false });
}

/**
 * POST /api/creative/variant-matrix/[id]
 * Update cell performance data or run an analysis on a matrix.
 * Body: { matrix: VariantMatrix, action: 'update' | 'analyze', cellUpdates? }
 *   - action 'update': merge cellUpdates (by cellId) into the matrix cells.
 *   - action 'analyze': run analyzeMatrix and return the MatrixResult.
 */
async function __byokPOST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const matrix = body.matrix as VariantMatrix | undefined;
  if (!matrix || matrix.matrixId !== id) {
    return NextResponse.json({ error: 'matrix_required' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : 'analyze';

  if (action === 'update') {
    const updates = Array.isArray(body.cellUpdates) ? body.cellUpdates : [];
    const byId = new Map<string, (Partial<MatrixCell> & { performance?: MatrixCellPerformance })>();
    for (const u of updates) {
      if (u && typeof u.cellId === 'string') byId.set(u.cellId, u);
    }

    const cells = matrix.cells.map((c) => {
      const u = byId.get(c.cellId);
      if (!u) return c;
      const merged: MatrixCell = { ...c, ...u };
      if (u.performance) {
        merged.performance = u.performance;
        merged.score = calculateCellScore(merged);
        merged.status = merged.performance.roas >= 2 ? 'winning' : merged.performance.roas < 1 ? 'underperforming' : 'tested';
        merged.testedAt = new Date().toISOString();
      }
      return merged;
    });

    const updated: VariantMatrix = {
      ...matrix,
      cells,
      generatedCells: cells.filter((c) => c.status !== 'untested').length,
      testedCells: cells.filter((c) => c.status === 'tested' || c.status === 'winning' || c.status === 'underperforming').length,
      winningCells: cells.filter((c) => c.status === 'winning').length,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ matrix: updated });
  }

  // action === 'analyze'
  const result = analyzeMatrix(matrix);
  return NextResponse.json({ result });
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
