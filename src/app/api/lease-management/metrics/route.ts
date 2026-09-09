import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LeaseManagementService } from '@/lib/services/lease-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeContracts: 0, totalMonthlyRent: 0, pendingPayments: 0, overduePayments: 0, availableProperties: 0, leasedProperties: 0, activeTenants: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await LeaseManagementService.getLeaseManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
