import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** POST /api/portfolio/allocations/[id]/rebalance — rebalance a portfolio allocation */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const allocation = await PortfolioService.rebalanceAllocation(id, session.user.id);
    if (!allocation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ allocation });
  } catch (e) {
    console.error('[portfolio/allocations/rebalance] error:', e);
    return NextResponse.json({ error: 'failed_to_rebalance_allocation' }, { status: 500 });
  }
}
