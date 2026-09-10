import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GdprService } from '@/lib/services/gdpr-service';

/** GET /api/data/gdpr/requests/[id] — get a single data request */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  // DataRequest uses findUnique via prisma directly
  const request = await GdprService.getDataRequests().then((reqs) =>
    (reqs as Array<{ id: string }>).find((r) => r.id === id),
  );
  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ request });
}

/** POST /api/data/gdpr/requests/[id] — process (update status of) a data request */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || 'completed') as 'pending' | 'in_review' | 'completed' | 'rejected';

  try {
    const request = await GdprService.processDataRequest(id, status, session.user.id);
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[data/gdpr/requests] process error:', e);
    return NextResponse.json({ error: 'failed_to_process_request' }, { status: 500 });
  }
}
