import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { CAPAStatus, CAPAType } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/capas — list CAPAs */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const capas = await QualityManagementService.listCAPAs(organizationId, {
    status: (sp.get('status') as CAPAStatus) || undefined,
    type: (sp.get('type') as CAPAType) || undefined,
  });

  return NextResponse.json({ capas });
}

/** POST /api/quality-management/capas — create a CAPA */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = body.type as CAPAType | undefined;
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!type || !['corrective', 'preventive', 'both'].includes(type)) {
    return NextResponse.json({ error: 'valid_type_required' }, { status: 400 });
  }

  try {
    const capa = await QualityManagementService.createCAPA(
      organizationId,
      body.workspaceId || organizationId,
      {
        nonconformanceId: body.nonconformanceId,
        title,
        description: body.description,
        type,
        rootCause: body.rootCause,
        correctiveAction: body.correctiveAction,
        preventiveAction: body.preventiveAction,
        assignedTo: body.assignedTo,
        dueDate: body.dueDate,
        status: body.status as CAPAStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ capa }, { status: 201 });
  } catch (e) {
    console.error('[quality-management] create capa error:', e);
    return NextResponse.json({ error: 'failed_to_create_capa' }, { status: 500 });
  }
}
