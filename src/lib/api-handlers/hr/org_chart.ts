import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeService } from '@/lib/services/employee-service';

/** GET /api/hr/org-chart — get the organization chart tree */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ orgChart: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const orgChart = await EmployeeService.getOrgChart(organizationId);
  return NextResponse.json({ orgChart });
}
