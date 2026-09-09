import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CapacityService } from '@/lib/services/capacity-service';

/** GET /api/capacity/forecast?weeks=4 — capacity forecast */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ forecast: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const weeks = Number(url.searchParams.get('weeks') || '4');
  const forecast = await CapacityService.getForecast(organizationId, weeks);
  return NextResponse.json({ forecast });
}
