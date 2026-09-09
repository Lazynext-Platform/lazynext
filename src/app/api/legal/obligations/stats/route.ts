import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalObligationService } from '@/lib/services/legal-obligation-service';

/** GET /api/legal/obligations/stats — obligation stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        totalObligations: 0,
        byType: {},
        byStatus: {},
        overdueCount: 0,
        upcomingCount: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await LegalObligationService.getStats(organizationId);
  return NextResponse.json({ stats });
}
