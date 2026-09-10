import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DistributionService } from '@/lib/services/distribution-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeCenters: 0, activeChannels: 0, pendingFulfillments: 0, deliveredFulfillments: 0, fulfillmentRate: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await DistributionService.getDistributionMetrics(organizationId);
  return NextResponse.json({ metrics });
}
