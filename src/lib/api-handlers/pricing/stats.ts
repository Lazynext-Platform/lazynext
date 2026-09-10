import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/stats — get pricing stats */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { modelCount: 0, activeModelCount: 0, tierCount: 0, experimentCount: 0, runningExperimentCount: 0, discountCount: 0, activeDiscountCount: 0, revenueStreamCount: 0, activeRevenueStreamCount: 0, totalMrr: 0, projectedMrr: 0, byModelType: {}, byDiscountType: {}, byRevenueStreamType: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const stats = await PricingService.getStats(organizationId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[pricing/stats] error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
