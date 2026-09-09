import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITAssetService } from '@/lib/services/it-asset-service';

/** GET /api/it/assets — list IT assets */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ assets: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: { type?: string; status?: string; category?: string; assignedToId?: string; search?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const assignedToId = url.searchParams.get('assignedToId');
  const search = url.searchParams.get('search');
  if (type) filters.type = type;
  if (status) filters.status = status;
  if (category) filters.category = category;
  if (assignedToId) filters.assignedToId = assignedToId;
  if (search) filters.search = search;

  const assets = await ITAssetService.list(organizationId, filters);
  return NextResponse.json({ assets });
}

/** POST /api/it/assets — create an IT asset */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const asset = await ITAssetService.create({
      organizationId,
      workspaceId: body.workspaceId,
      assetTag: body.assetTag,
      name,
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
    return NextResponse.json({ asset }, { status: 201 });
  } catch (e) {
    console.error('[it/assets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_asset' }, { status: 500 });
  }
}
