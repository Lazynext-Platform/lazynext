import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorPerformanceService } from '@/lib/services/vendor-performance-service';

/** GET /api/vendors/performance/stats — get performance stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        totalReviews: 0,
        avgRating: 0,
        avgOverallScore: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await VendorPerformanceService.getStats(organizationId);

  return NextResponse.json({ stats });
}
