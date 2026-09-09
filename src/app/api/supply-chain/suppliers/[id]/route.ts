import { NextRequest, NextResponse } from 'next/server';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { SupplierStatus } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/suppliers/[id] — get a supplier by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await SupplyChainService.getSupplier(id);
  if (!supplier) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ supplier });
}

/** PATCH /api/supply-chain/suppliers/[id] — update a supplier */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const supplier = await SupplyChainService.updateSupplier(id, {
      name: body.name,
      category: body.category,
      location: body.location,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      rating: body.rating,
      paymentTerms: body.paymentTerms,
      leadTimeDays: body.leadTimeDays,
      status: body.status as SupplierStatus | undefined,
    });
    if (!supplier) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ supplier });
  } catch (e) {
    console.error('[supply-chain/suppliers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_supplier' }, { status: 500 });
  }
}

/** DELETE /api/supply-chain/suppliers/[id] — delete a supplier */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await SupplyChainService.deleteSupplier(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
