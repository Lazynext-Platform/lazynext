import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DistributionService } from '@/lib/services/distribution-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { centerCount: 0, channelCount: 0, fulfillmentCount: 0, networkCount: 0, activeCenterCount: 0, activeChannelCount: 0, pendingFulfillmentCount: 0, deliveredFulfillmentCount: 0, byCenterType: {}, byCenterStatus: {}, byChannelType: {}, byChannelStatus: {}, byFulfillmentStatus: {}, byNetworkType: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await DistributionService.getDistributionStats(organizationId);
  return NextResponse.json({ stats });
}
