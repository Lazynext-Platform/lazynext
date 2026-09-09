import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/stats — sustainability stats (query: organizationId) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      metricCount: 0, targetCount: 0, initiativeCount: 0, reportCount: 0,
      carbonEmissionCount: 0, assessmentCount: 0,
      totalEmissions: 0, totalOffset: 0, netEmissions: 0,
    });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  const stats = await SustainabilityService.getStats(organizationId);
  return NextResponse.json(stats);
}
