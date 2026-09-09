import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VendorPerformanceService } from '@/lib/services/vendor-performance-service';

/** GET /api/vendors/performance/[id] — get a performance review by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const review = await VendorPerformanceService.get(id);
  if (!review) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ review });
}
