import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** GET /api/employee-development/certifications/stats — certification stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, active: 0, expiring: 0, expired: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [total, active, expiring, expired] = await Promise.all([
    EmployeeDevelopmentService.listCertifications(organizationId),
    EmployeeDevelopmentService.listCertifications(organizationId, { status: 'active' }),
    EmployeeDevelopmentService.getExpiringCertifications(organizationId, 30),
    EmployeeDevelopmentService.listCertifications(organizationId, { status: 'expired' }),
  ]);
  void horizon;
  return NextResponse.json({
    stats: {
      total: total.length,
      active: active.length,
      expiring: expiring.length,
      expired: expired.length,
    },
  });
}
