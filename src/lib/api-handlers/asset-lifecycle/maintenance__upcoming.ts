import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetLifecycleService } from '@/lib/services/asset-lifecycle-service';

/** GET /api/asset-lifecycle/maintenance/upcoming — upcoming maintenance */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ maintenance: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days') || 30);

  const maintenance = await AssetLifecycleService.getUpcomingMaintenance(organizationId, days);
  return NextResponse.json({ maintenance });
}
