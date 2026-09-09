import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** POST /api/grants/applications/[id]/withdraw — withdraw an application */
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
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const application = await GrantService.withdrawApplication(id, reason, session.user.id);
    if (!application) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ application });
  } catch (e) {
    console.error('[grants/applications/withdraw] error:', e);
    return NextResponse.json({ error: 'failed_to_withdraw_application' }, { status: 500 });
  }
}
