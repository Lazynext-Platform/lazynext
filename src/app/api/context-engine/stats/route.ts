import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ContextEngineService } from '@/lib/services/context-engine-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: {"snapshotCount":0,"sourceCount":0,"retrievalCount":0,"assemblyCount":0,"bySnapshotType":{},"bySnapshotStatus":{},"bySourceType":{},"bySourceStatus":{},"byRetrievalType":{},"byRetrievalStatus":{},"byAssemblyType":{},"byAssemblyStatus":{}} });
  const organizationId = workspaces[0].organizationId;
  const stats = await ContextEngineService.getContextEngineStats(organizationId);
  return NextResponse.json({ stats });
}
