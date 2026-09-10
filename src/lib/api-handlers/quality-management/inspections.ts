import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { InspectionStatus } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/inspections — list inspections */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const inspections = await QualityManagementService.listInspections(organizationId, {
    standardId: sp.get('standardId') || undefined,
    status: (sp.get('status') as InspectionStatus) || undefined,
    inspector: sp.get('inspector') || undefined,
  });

  return NextResponse.json({ inspections });
}

/** POST /api/quality-management/inspections — create an inspection */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const inspector = String(body.inspector || '').trim();
  const date = String(body.date || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!inspector) {
    return NextResponse.json({ error: 'inspector_required' }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: 'date_required' }, { status: 400 });
  }

  try {
    const inspection = await QualityManagementService.createInspection(
      organizationId,
      body.workspaceId || organizationId,
      {
        standardId: body.standardId,
        title,
        description: body.description,
        inspector,
        date,
        items: Array.isArray(body.items) ? body.items : [],
        status: body.status as InspectionStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ inspection }, { status: 201 });
  } catch (e) {
    console.error('[quality-management] create inspection error:', e);
    return NextResponse.json({ error: 'failed_to_create_inspection' }, { status: 500 });
  }
}
