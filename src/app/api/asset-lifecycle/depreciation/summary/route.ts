import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetDepreciationService } from '@/lib/services/asset-depreciation-service';

/** GET /api/asset-lifecycle/depreciation/summary — depreciation summary */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ summary: { totalAssets: 0, totalCost: 0, totalAccumulatedDepreciation: 0, totalBookValue: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const summary = await AssetDepreciationService.getDepreciationSummary(organizationId);
  return NextResponse.json({ summary });
}
