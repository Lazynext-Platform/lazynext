import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PermissionService } from '@/lib/services/permission-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: {"activePolicies":0,"activeRoles":0,"activeGrants":0,"allowedChecks":0,"deniedChecks":0} });
  const organizationId = workspaces[0].organizationId;
  const metrics = await PermissionService.getPermissionMetrics(organizationId);
  return NextResponse.json({ metrics });
}
