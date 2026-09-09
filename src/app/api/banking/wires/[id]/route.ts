import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/wires/[id] — get a single wire transfer */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const wire = await BankingService.getWireTransfer(id);
  if (!wire) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ wire });
}

/** PATCH /api/banking/wires/[id] — update a wire transfer */
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
    const wire = await BankingService.updateWireTransfer(id, {
      toAccountName: body.toAccountName, toAccountNumber: body.toAccountNumber,
      toRoutingNumber: body.toRoutingNumber, toBankName: body.toBankName,
      amount: body.amount, currency: body.currency, purpose: body.purpose,
      recipientAddress: body.recipientAddress, intermediaryBank: body.intermediaryBank,
      status: body.status, valueDate: body.valueDate,
    });
    if (!wire) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ wire });
  } catch (e) {
    console.error('[banking/wires] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_wire' }, { status: 500 });
  }
}
