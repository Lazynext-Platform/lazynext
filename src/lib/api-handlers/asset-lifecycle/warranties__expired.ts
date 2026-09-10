import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetWarrantyService } from '@/lib/services/asset-warranty-service';

/** GET /api/asset-lifecycle/warranties/expired — expired warranties */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ warranties: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const warranties = await AssetWarrantyService.getExpired(organizationId);
  return NextResponse.json({ warranties });
}
