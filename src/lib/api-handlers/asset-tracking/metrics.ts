import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { totalAssets: 0, assignedAssets: 0, availableAssets: 0, inRepairAssets: 0, retiredAssets: 0, totalValue: 0, activeDepreciations: 0, completedAudits: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await AssetTrackingService.getAssetTrackingMetrics(organizationId);
  return NextResponse.json({ metrics });
}
