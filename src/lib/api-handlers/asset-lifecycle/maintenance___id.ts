import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AssetLifecycleService } from '@/lib/services/asset-lifecycle-service';

/** GET /api/asset-lifecycle/maintenance/[id] — get a single maintenance record */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const maintenance = await AssetLifecycleService.getMaintenance(id);
  if (!maintenance) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ maintenance });
}

/** PATCH /api/asset-lifecycle/maintenance/[id] — update a maintenance record */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const maintenance = await AssetLifecycleService.updateMaintenance(id, {
      type: body.type,
      status: body.status,
      title: body.title,
      description: body.description,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
      cost: body.cost,
      performedBy: body.performedBy,
      vendorName: body.vendorName,
      notes: body.notes,
    });
    return NextResponse.json({ maintenance });
  } catch (e) {
    console.error('[asset-lifecycle/maintenance] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_maintenance' }, { status: 500 });
  }
}

/** DELETE /api/asset-lifecycle/maintenance/[id] — delete a maintenance record */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await AssetLifecycleService.deleteMaintenance(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[asset-lifecycle/maintenance] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_maintenance' }, { status: 500 });
  }
}
