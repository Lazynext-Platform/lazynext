import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceReviewService } from '@/lib/services/performance-review-service';

/** GET /api/hr/reviews/stats — get performance review stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, draft: 0, inProgress: 0, submitted: 0, completed: 0, byStatus: {}, byType: {}, byPeriod: {}, averageRating: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await PerformanceReviewService.getStats(organizationId);
  return NextResponse.json({ stats });
}
