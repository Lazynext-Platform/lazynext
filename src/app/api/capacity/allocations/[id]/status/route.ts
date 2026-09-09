import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CapacityService } from '@/lib/services/capacity-service';

/** POST /api/capacity/allocations/[id]/status — change allocation status */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '').trim();
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const allocation = await CapacityService.changeAllocationStatus(id, status);
    return NextResponse.json({ allocation });
  } catch (e) {
    console.error('[capacity/allocations/status] error:', e);
    return NextResponse.json({ error: 'failed_to_change_status' }, { status: 500 });
  }
}
