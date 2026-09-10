import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/renewals/[id] — get a single renewal */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const renewal = await CustomerSuccessService.getRenewal(id);
  if (!renewal) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ renewal });
}

/** PATCH /api/customer-success/renewals/[id] — update a renewal */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const renewal = await CustomerSuccessService.updateRenewal(id, {
      contractId: body.contractId, currentMrr: body.currentMrr, renewalDate: body.renewalDate,
      renewalValue: body.renewalValue, termMonths: body.termMonths, status: body.status,
      probability: body.probability, notes: body.notes,
    });
    if (!renewal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ renewal });
  } catch (e) {
    console.error('[customer-success/renewals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_renewal' }, { status: 500 });
  }
}
