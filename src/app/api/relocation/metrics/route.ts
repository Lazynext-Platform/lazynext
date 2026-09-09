import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RelocationService } from '@/lib/services/relocation-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeCases: 0, inTransitMoves: 0, pendingExpenses: 0, totalBudget: 0, preferredVendors: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await RelocationService.getRelocationMetrics(organizationId);
  return NextResponse.json({ metrics });
}
