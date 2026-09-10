import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LogisticsService } from '@/lib/services/logistics-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeShipments: 0, deliveredShipments: 0, inTransitShipments: 0, delayedShipments: 0, carrierCount: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await LogisticsService.getLogisticsMetrics(organizationId);
  return NextResponse.json({ metrics });
}
