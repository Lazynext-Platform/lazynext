import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RndService } from '@/lib/services/rnd-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeProjects: 0, completedProjects: 0, activeExperiments: 0, grantedPatents: 0, launchedInnovations: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await RndService.getRndMetrics(organizationId);
  return NextResponse.json({ metrics });
}
