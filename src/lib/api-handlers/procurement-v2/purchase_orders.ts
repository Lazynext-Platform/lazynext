import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';
import type { POStatus } from '@/lib/services/purchase-order-service';

/** GET /api/procurement-v2/purchase-orders — list purchase orders */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const purchaseOrders = await PurchaseOrderService.list(organizationId, {
    status: (sp.get('status') as POStatus) || undefined,
    vendorId: sp.get('vendorId') || undefined,
    startDate: sp.get('startDate') || undefined,
    endDate: sp.get('endDate') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ purchaseOrders });
}

/** POST /api/procurement-v2/purchase-orders — create a purchase order */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const vendorId = String(body.vendorId || '').trim();
  const vendorName = String(body.vendorName || '').trim();
  if (!vendorId || !vendorName) {
    return NextResponse.json({ error: 'vendor_required' }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 });
  }

  try {
    const purchaseOrder = await PurchaseOrderService.create(organizationId, {
      vendorId,
      vendorName,
      items: body.items,
      expectedDeliveryDate: body.expectedDeliveryDate,
      notes: body.notes,
      workspaceId: body.workspaceId,
      createdBy: userId,
    });
    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (e) {
    console.error('[procurement-v2/purchase-orders] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_purchase_order' }, { status: 500 });
  }
}
