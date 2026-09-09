import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { JobArchitectureService } from '@/lib/services/job-architecture-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { familyCount: 0, levelCount: 0, roleCount: 0, pathCount: 0, byFamilyType: {}, byFamilyStatus: {}, byLevelType: {}, byLevelStatus: {}, byRoleType: {}, byRoleStatus: {}, byPathType: {}, byPathStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await JobArchitectureService.getJobArchitectureStats(organizationId);
  return NextResponse.json({ stats });
}
