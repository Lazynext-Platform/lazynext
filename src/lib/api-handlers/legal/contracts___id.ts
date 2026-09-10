import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LegalContractService } from '@/lib/services/legal-contract-service';

/** GET /api/legal/contracts/[id] — get a contract by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const contract = await LegalContractService.get(id);
  if (!contract) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ contract });
}

/** PATCH /api/legal/contracts/[id] — update a contract */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const contract = await LegalContractService.update(id, {
      title: body.title,
      type: body.type,
      partyName: body.partyName,
      partyType: body.partyType,
      effectiveDate: body.effectiveDate,
      endDate: body.endDate,
      value: body.value,
      currency: body.currency,
      jurisdiction: body.jurisdiction,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    if (!contract) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ contract });
  } catch (e) {
    console.error('[legal/contracts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_contract' }, { status: 500 });
  }
}

/** DELETE /api/legal/contracts/[id] — delete a contract */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const deleted = await LegalContractService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
