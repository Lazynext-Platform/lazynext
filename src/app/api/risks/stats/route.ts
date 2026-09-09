import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RiskService } from '@/lib/services/risk-service';

/** GET /api/risks/stats — risk stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        totalRisks: 0,
        byCategory: {},
        byLevel: { low: 0, medium: 0, high: 0, critical: 0 },
        byStatus: {},
        avgRiskScore: 0,
        highCriticalCount: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await RiskService.getStats(organizationId);
  return NextResponse.json({ stats });
}
