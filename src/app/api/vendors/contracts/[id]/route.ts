import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VendorContractService } from '@/lib/services/vendor-contract-service';

/** GET /api/vendors/contracts/[id] — get a contract by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const contract = await VendorContractService.get(id);
  if (!contract) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ contract });
}

/** PATCH /api/vendors/contracts/[id] — update a contract */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const contract = await VendorContractService.update(id, {
      title: body.title,
      contractType: body.contractType,
      startDate: body.startDate,
      endDate: body.endDate,
      value: body.value != null ? Number(body.value) : undefined,
      currency: body.currency,
      status: body.status,
      terms: body.terms,
      renewalDate: body.renewalDate,
    });
    if (!contract) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ contract });
  } catch (e) {
    console.error('[vendors/contracts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_contract' }, { status: 500 });
  }
}

/** DELETE /api/vendors/contracts/[id] — delete a contract */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await VendorContractService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
