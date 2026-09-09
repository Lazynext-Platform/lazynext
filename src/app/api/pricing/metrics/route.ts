import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/metrics — get pricing metrics */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { totalMrr: 0, projectedMrr: 0, revenueByStream: [], activeExperiments: 0, discountUtilization: 0, pricingModelCoverage: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const metrics = await PricingService.getPricingMetrics(organizationId);
    return NextResponse.json({ metrics });
  } catch (e) {
    console.error('[pricing/metrics] error:', e);
    return NextResponse.json({ error: 'failed_to_get_metrics' }, { status: 500 });
  }
}
