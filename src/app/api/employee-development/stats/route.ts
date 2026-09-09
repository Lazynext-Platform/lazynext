import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** GET /api/employee-development/stats — overall employee development stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { totalTrainingPlans: 0, trainingByStatus: {}, totalCertifications: 0, activeCerts: 0, expiringCerts: 0, avgTrainingProgress: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await EmployeeDevelopmentService.getStats(organizationId);
  return NextResponse.json({ stats });
}
