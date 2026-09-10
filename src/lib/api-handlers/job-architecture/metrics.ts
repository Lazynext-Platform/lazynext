import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { JobArchitectureService } from '@/lib/services/job-architecture-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeFamilies: 0, activeLevels: 0, activeRoles: 0, activePaths: 0, totalHeadcount: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await JobArchitectureService.getJobArchitectureMetrics(organizationId);
  return NextResponse.json({ metrics });
}
