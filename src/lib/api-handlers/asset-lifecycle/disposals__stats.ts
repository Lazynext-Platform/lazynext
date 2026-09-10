import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetDepreciationService } from '@/lib/services/asset-depreciation-service';

/** GET /api/asset-lifecycle/disposals/stats — disposal stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, byMethod: {}, totalRecovery: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const disposals = await AssetDepreciationService.getAssetDisposals(organizationId);
  const byMethod: Record<string, number> = {};
  let totalRecovery = 0;
  for (const d of disposals as Array<{ disposalMethod?: string; disposalValue?: number }>) {
    const method = d.disposalMethod || 'unknown';
    byMethod[method] = (byMethod[method] || 0) + 1;
    totalRecovery += d.disposalValue ?? 0;
  }
  return NextResponse.json({ stats: { total: disposals.length, byMethod, totalRecovery } });
}
