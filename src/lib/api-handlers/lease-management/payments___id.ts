import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LeaseManagementService } from '@/lib/services/lease-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const payment = await LeaseManagementService.getPayment(id);
  if (!payment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ payment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const payment = await LeaseManagementService.updatePayment(id, body);
    if (!payment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ payment });
  } catch (e) {
    console.error('[lease-management/payments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_payment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await LeaseManagementService.deletePayment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
