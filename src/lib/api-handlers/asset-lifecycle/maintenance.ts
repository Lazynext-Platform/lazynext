import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetLifecycleService } from '@/lib/services/asset-lifecycle-service';

/** GET /api/asset-lifecycle/maintenance — list maintenance records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ maintenance: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { itAssetId?: string; type?: string; status?: string; dateFrom?: Date; dateTo?: Date } = {};
  const itAssetId = url.searchParams.get('itAssetId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  if (itAssetId) opts.itAssetId = itAssetId;
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (dateFrom) opts.dateFrom = new Date(dateFrom);
  if (dateTo) opts.dateTo = new Date(dateTo);

  const maintenance = await AssetLifecycleService.listMaintenance(organizationId, opts);
  return NextResponse.json({ maintenance });
}

/** POST /api/asset-lifecycle/maintenance — create a maintenance record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const itAssetId = String(body.itAssetId || '').trim();
  if (!title || !itAssetId) {
    return NextResponse.json({ error: 'title_and_itAssetId_required' }, { status: 400 });
  }
  if (!body.scheduledDate) {
    return NextResponse.json({ error: 'scheduledDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const maintenance = await AssetLifecycleService.createMaintenance(organizationId, {
      itAssetId,
      title,
      type: body.type,
      status: body.status,
      description: body.description,
      scheduledDate: new Date(body.scheduledDate),
      completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
      cost: body.cost,
      performedBy: body.performedBy,
      vendorName: body.vendorName,
      notes: body.notes,
    });
    return NextResponse.json({ maintenance }, { status: 201 });
  } catch (e) {
    console.error('[asset-lifecycle/maintenance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_maintenance' }, { status: 500 });
  }
}
