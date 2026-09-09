import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { SupplierStatus } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/suppliers — list suppliers */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const suppliers = await SupplyChainService.listSuppliers(organizationId, {
    category: sp.get('category') || undefined,
    status: (sp.get('status') as SupplierStatus) || undefined,
    location: sp.get('location') || undefined,
  });

  return NextResponse.json({ suppliers });
}

/** POST /api/supply-chain/suppliers — create a supplier */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const supplier = await SupplyChainService.createSupplier(
      organizationId,
      body.workspaceId || organizationId,
      {
        name,
        category: body.category,
        location: body.location,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        rating: body.rating,
        paymentTerms: body.paymentTerms,
        leadTimeDays: body.leadTimeDays,
        status: body.status as SupplierStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (e) {
    console.error('[supply-chain/suppliers] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_supplier' }, { status: 500 });
  }
}
