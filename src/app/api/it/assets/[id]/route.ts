import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITAssetService } from '@/lib/services/it-asset-service';

/** GET /api/it/assets/[id] — get a single IT asset */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const asset = await ITAssetService.get(id);
  if (!asset) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ asset });
}

/** PATCH /api/it/assets/[id] — update an IT asset */
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
    const asset = await ITAssetService.update(id, {
      assetTag: body.assetTag,
      name: body.name,
      type: body.type,
      category: body.category,
      status: body.status,
      serialNumber: body.serialNumber,
      manufacturer: body.manufacturer,
      model: body.model,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      purchaseCost: body.purchaseCost,
      currentValue: body.currentValue,
      currency: body.currency,
      assignedToId: body.assignedToId,
      assignedToType: body.assignedToType,
      location: body.location,
      notes: body.notes,
      metadata: body.metadata,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
      licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : undefined,
      licenseKey: body.licenseKey,
      licenseSeats: body.licenseSeats,
      licenseUsed: body.licenseUsed,
      vendorId: body.vendorId,
    });
    return NextResponse.json({ asset });
  } catch (e) {
    console.error('[it/assets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_asset' }, { status: 500 });
  }
}

/** DELETE /api/it/assets/[id] — delete an IT asset */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await ITAssetService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[it/assets] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_asset' }, { status: 500 });
  }
}
