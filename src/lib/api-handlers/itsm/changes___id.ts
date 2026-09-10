import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ChangeManagementService } from '@/lib/services/change-management-service';

/** GET /api/itsm/changes/[id] — get a single change request */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const change = await ChangeManagementService.get(id);
  if (!change) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ change });
}

/** PATCH /api/itsm/changes/[id] — update a change request */
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
    const change = await ChangeManagementService.update(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      status: body.status,
      priority: body.priority,
      riskLevel: body.riskLevel,
      rollbackPlan: body.rollbackPlan,
      impactAnalysis: body.impactAnalysis,
      affectedSystems: Array.isArray(body.affectedSystems) ? body.affectedSystems : undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
    return NextResponse.json({ change });
  } catch (e) {
    console.error('[itsm/changes] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_change' }, { status: 500 });
  }
}

/** DELETE /api/itsm/changes/[id] — delete a change request */
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
    await ChangeManagementService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[itsm/changes] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_change' }, { status: 500 });
  }
}
