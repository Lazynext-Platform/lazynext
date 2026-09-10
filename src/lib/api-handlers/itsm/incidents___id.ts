import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITSMService } from '@/lib/services/itsm-service';

/** GET /api/itsm/incidents/[id] — get a single incident */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const incident = await ITSMService.get(id);
  if (!incident) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ incident });
}

/** PATCH /api/itsm/incidents/[id] — update an incident */
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
    const incident = await ITSMService.update(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      status: body.status,
      severity: body.severity,
      category: body.category,
      assignedToId: body.assignedToId,
      reportedById: body.reportedById,
      affectedService: body.affectedService,
      resolution: body.resolution,
      slaDueAt: body.slaDueAt ? new Date(body.slaDueAt) : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[itsm/incidents] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_incident' }, { status: 500 });
  }
}

/** DELETE /api/itsm/incidents/[id] — delete an incident */
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
    await ITSMService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[itsm/incidents] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_incident' }, { status: 500 });
  }
}
