import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { openOrders: 0, completedOrders: 0, availableTechnicians: 0, activeAssignments: 0, equipmentUtilization: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await FieldServiceService.getFieldServiceMetrics(organizationId);
  return NextResponse.json({ metrics });
}
