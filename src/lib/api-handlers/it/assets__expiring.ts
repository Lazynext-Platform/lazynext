import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITAssetService } from '@/lib/services/it-asset-service';

/** GET /api/it/assets/expiring — get assets with expiring licenses */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ assets: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30', 10);

  const assets = await ITAssetService.getExpiringLicenses(organizationId, days);
  return NextResponse.json({ assets });
}
