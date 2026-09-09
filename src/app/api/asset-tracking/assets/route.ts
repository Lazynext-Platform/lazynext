import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ assets: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['category', 'status', 'condition', 'department']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const assets = await AssetTrackingService.listAssets(organizationId, opts as never);
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  if (!name || !category) return NextResponse.json({ error: 'name_category_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const asset = await AssetTrackingService.createAsset(ws.organizationId, ws.id, {
      name, category: category as never,
      assetTag: body.assetTag, serialNumber: body.serialNumber, description: body.description,
      status: body.status, condition: body.condition, location: body.location, department: body.department,
      purchaseDate: body.purchaseDate, purchasePrice: body.purchasePrice, currentValue: body.currentValue,
      supplier: body.supplier, warrantyExpiry: body.warrantyExpiry, insuranceValue: body.insuranceValue, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (e) {
    console.error('[asset-tracking/assets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_asset' }, { status: 500 });
  }
}
