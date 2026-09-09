import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/disbursements/[id] — get a single disbursement */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const disbursement = await GrantService.getDisbursement(id);
  if (!disbursement) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ disbursement });
}

/** PATCH /api/grants/disbursements/[id] — update a disbursement */
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

  try {
    const disbursement = await GrantService.updateDisbursement(id, {
      amount: body.amount, date: body.date, purpose: body.purpose,
      status: body.status, restrictions: body.restrictions, notes: body.notes,
    });
    if (!disbursement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ disbursement });
  } catch (e) {
    console.error('[grants/disbursements] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_disbursement' }, { status: 500 });
  }
}
