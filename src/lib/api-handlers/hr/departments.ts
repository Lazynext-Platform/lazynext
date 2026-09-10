import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeService } from '@/lib/services/employee-service';

/** GET /api/hr/departments — list distinct departments */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ departments: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const departments = await EmployeeService.getDepartments(organizationId);
  return NextResponse.json({ departments });
}
