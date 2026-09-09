import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmergencyResponseService } from '@/lib/services/emergency-response-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { planCount: 0, drillCount: 0, routeCount: 0, contactCount: 0, byPlanType: {}, byPlanStatus: {}, byDrillType: {}, byDrillStatus: {}, byRouteType: {}, byRouteStatus: {}, byContactType: {}, byContactStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await EmergencyResponseService.getEmergencyResponseStats(organizationId);
  return NextResponse.json({ stats });
}
