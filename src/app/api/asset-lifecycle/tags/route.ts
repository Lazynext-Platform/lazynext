import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetDepreciationService } from '@/lib/services/asset-depreciation-service';

/** GET /api/asset-lifecycle/tags — get all asset tags */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ tags: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const tags = await AssetDepreciationService.getAssetTags(organizationId);
  return NextResponse.json({ tags });
}
