import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/carbon-footprint — carbon footprint (query: organizationId, period) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      scope1: 0, scope2: 0, scope3: 0, total: 0, totalOffset: 0, netTotal: 0,
    });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: string } = {};
  const period = sp.get('period');
  if (period) opts.period = period;

  const footprint = await SustainabilityService.getCarbonFootprint(organizationId, opts);
  return NextResponse.json(footprint);
}
