import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { CAPAStatus, CAPAType } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/capas/[id] — get a CAPA by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const capa = await QualityManagementService.getCAPA(id);
  if (!capa) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ capa });
}

/** PATCH /api/quality-management/capas/[id] — update a CAPA */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const capa = await QualityManagementService.updateCAPA(id, {
      title: body.title,
      description: body.description,
      type: body.type as CAPAType | undefined,
      rootCause: body.rootCause,
      correctiveAction: body.correctiveAction,
      preventiveAction: body.preventiveAction,
      assignedTo: body.assignedTo,
      dueDate: body.dueDate,
      status: body.status as CAPAStatus | undefined,
    });
    if (!capa) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ capa });
  } catch (e) {
    console.error('[quality-management] update capa error:', e);
    return NextResponse.json({ error: 'failed_to_update_capa' }, { status: 500 });
  }
}
