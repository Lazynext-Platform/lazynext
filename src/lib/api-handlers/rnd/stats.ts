import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RndService } from '@/lib/services/rnd-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { projectCount: 0, experimentCount: 0, patentCount: 0, innovationCount: 0, activeProjectCount: 0, completedProjectCount: 0, grantedPatentCount: 0, launchedInnovationCount: 0, byProjectType: {}, byProjectStatus: {}, byExperimentStatus: {}, byPatentStatus: {}, byInnovationStatus: {}, byInnovationStage: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await RndService.getRndStats(organizationId);
  return NextResponse.json({ stats });
}
