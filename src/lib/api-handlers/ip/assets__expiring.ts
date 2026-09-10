import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/assets/expiring — list expiring IP assets */
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
  const daysAhead = Number(url.searchParams.get('daysAhead') || 180);

  const assets = await IPService.getExpiringIP(organizationId, daysAhead);
  return NextResponse.json({ assets });
}
