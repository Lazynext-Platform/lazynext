import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** POST /api/customer-success/renewals/[id]/close — close a renewal */
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
  const status = String(body.status || '').trim();
  if (status !== 'renewed' && status !== 'churned' && status !== 'downgraded') {
    return NextResponse.json({ error: 'status_must_be_renewed_churned_or_downgraded' }, { status: 400 });
  }

  try {
    const renewal = await CustomerSuccessService.closeRenewal(id, status as 'renewed' | 'churned' | 'downgraded', session.user.id, body.notes);
    if (!renewal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ renewal });
  } catch (e) {
    console.error('[customer-success/renewals/close] error:', e);
    return NextResponse.json({ error: 'failed_to_close_renewal' }, { status: 500 });
  }
}
