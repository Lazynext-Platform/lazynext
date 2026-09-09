import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { totalApplications: 0, grantedPatents: 0, pendingExamination: 0, activeLicenses: 0, pendingMaintenanceFees: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await PatentManagementService.getPatentManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
