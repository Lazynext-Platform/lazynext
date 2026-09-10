import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LaborRelationsService } from '@/lib/services/labor-relations-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeUnions: 0, openGrievances: 0, criticalGrievances: 0, activeContracts: 0, openDisputes: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await LaborRelationsService.getLaborRelationsMetrics(organizationId);
  return NextResponse.json({ metrics });
}
