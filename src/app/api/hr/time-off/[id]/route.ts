import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimeOffService } from '@/lib/services/time-off-service';

/** GET /api/hr/time-off/[id] — get a single time-off request */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const request = await TimeOffService.get(id);
  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ request });
}

/** PATCH /api/hr/time-off/[id] — update a time-off request */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // Only allow updating reason/type via the generic update path;
  // status changes go through the dedicated approve/deny/cancel endpoints.
  try {
    const request = await TimeOffService.update(id, {
      reason: body.reason,
      type: body.type,
    });
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[hr/time-off] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_request' }, { status: 500 });
  }
}
