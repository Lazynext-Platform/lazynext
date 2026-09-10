import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeService } from '@/lib/services/employee-service';

/** GET /api/hr/stats — get aggregate HR stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, byStatus: {}, byDepartment: {}, byEmploymentType: {}, averageSalary: 0, activeCount: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await EmployeeService.getStats(organizationId);
  return NextResponse.json({ stats });
}
