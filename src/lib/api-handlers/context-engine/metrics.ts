import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ContextEngineService } from '@/lib/services/context-engine-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: {"activeSnapshots":0,"activeSources":0,"completedRetrievals":0,"deliveredAssemblies":0,"totalTokens":0} });
  const organizationId = workspaces[0].organizationId;
  const metrics = await ContextEngineService.getContextEngineMetrics(organizationId);
  return NextResponse.json({ metrics });
}
