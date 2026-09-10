import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmergencyResponseService } from '@/lib/services/emergency-response-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activePlans: 0, scheduledDrills: 0, activeRoutes: 0, activeContacts: 0, completedDrills: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await EmergencyResponseService.getEmergencyResponseMetrics(organizationId);
  return NextResponse.json({ metrics });
}
