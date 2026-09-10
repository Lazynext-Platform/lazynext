import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { orderCount: 0, technicianCount: 0, assignmentCount: 0, equipmentCount: 0, byOrderType: {}, byOrderStatus: {}, byOrderPriority: {}, byTechnicianStatus: {}, byAssignmentStatus: {}, byEquipmentType: {}, byEquipmentStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await FieldServiceService.getFieldServiceStats(organizationId);
  return NextResponse.json({ stats });
}
