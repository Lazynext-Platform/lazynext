import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimeOffService } from '@/lib/services/time-off-service';

/** POST /api/hr/time-off/[id]/approve — approve a time-off request */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const request = await TimeOffService.approve(id, session.user.id);
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[hr/time-off] approve error:', e);
    return NextResponse.json({ error: 'failed_to_approve_request' }, { status: 500 });
  }
}
