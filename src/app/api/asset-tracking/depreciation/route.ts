import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ depreciations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['assetId', 'method', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const depreciations = await AssetTrackingService.listDepreciations(organizationId, opts as never);
  return NextResponse.json({ depreciations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const assetId = String(body.assetId || '').trim();
  const method = String(body.method || '').trim();
  if (!assetId || !method) return NextResponse.json({ error: 'assetId_method_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const depreciation = await AssetTrackingService.createDepreciation(ws.organizationId, ws.id, {
      assetId, method: method as never,
      status: body.status, purchasePrice: body.purchasePrice, salvageValue: body.salvageValue,
      usefulLife: body.usefulLife, annualDepreciation: body.annualDepreciation,
      accumulatedDepreciation: body.accumulatedDepreciation, currentValue: body.currentValue,
      startDate: body.startDate, endDate: body.endDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ depreciation }, { status: 201 });
  } catch (e) {
    console.error('[asset-tracking/depreciation] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_depreciation' }, { status: 500 });
  }
}
