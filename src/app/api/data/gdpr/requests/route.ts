import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GdprService } from '@/lib/services/gdpr-service';

/** GET /api/data/gdpr/requests — list data subject access requests */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as 'pending' | 'in_review' | 'completed' | 'rejected' | null;

  const requests = await GdprService.getDataRequests(status || undefined);
  return NextResponse.json({ requests });
}

/** POST /api/data/gdpr/requests — create a data subject access request */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  if (!email) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }

  try {
    const request = await GdprService.createDataRequest({
      userId: body.userId || session.user.id,
      type: String(body.type || 'access') as 'access' | 'correction' | 'deletion' | 'portability' | 'restriction' | 'objection',
      email,
      name: body.name,
      details: body.details,
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error('[data/gdpr/requests] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_request' }, { status: 500 });
  }
}
