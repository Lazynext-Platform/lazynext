import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetWarrantyService } from '@/lib/services/asset-warranty-service';

/** GET /api/asset-lifecycle/warranties/expiring — expiring warranties */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ warranties: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days') || 30);

  const warranties = await AssetWarrantyService.getExpiring(organizationId, days);
  return NextResponse.json({ warranties });
}
