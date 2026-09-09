import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StrategyService } from '@/lib/services/strategy-service';

/** GET /api/strategy/alignment — get alignment matrix */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ initiatives: [], totalGoals: 0 });
  }

  const organizationId = workspaces[0].organizationId;
  const matrix = await StrategyService.getAlignmentMatrix(organizationId);
  return NextResponse.json(matrix);
}
