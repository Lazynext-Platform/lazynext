import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITContractService } from '@/lib/services/it-contract-service';

/** GET /api/it/contracts/[id] — get a single IT contract */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const contract = await ITContractService.get(id);
  if (!contract) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ contract });
}

/** PATCH /api/it/contracts/[id] — update an IT contract */
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
    const contract = await ITContractService.update(id, {
      vendorName: body.vendorName,
      contractType: body.contractType,
      title: body.title,
      description: body.description,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      value: body.value,
      currency: body.currency,
      status: body.status,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined,
      terms: body.terms,
      metadata: body.metadata,
    });
    return NextResponse.json({ contract });
  } catch (e) {
    console.error('[it/contracts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_contract' }, { status: 500 });
  }
}

/** DELETE /api/it/contracts/[id] — delete an IT contract */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await ITContractService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[it/contracts] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_contract' }, { status: 500 });
  }
}
