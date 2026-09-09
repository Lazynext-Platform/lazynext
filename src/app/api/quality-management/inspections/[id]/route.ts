import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { InspectionStatus } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/inspections/[id] — get an inspection by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inspection = await QualityManagementService.getInspection(id);
  if (!inspection) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ inspection });
}

/** PATCH /api/quality-management/inspections/[id] — update an inspection */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const inspection = await QualityManagementService.updateInspection(id, {
      standardId: body.standardId,
      title: body.title,
      description: body.description,
      inspector: body.inspector,
      date: body.date,
      items: Array.isArray(body.items) ? body.items : undefined,
      status: body.status as InspectionStatus | undefined,
    });
    if (!inspection) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ inspection });
  } catch (e) {
    console.error('[quality-management] update inspection error:', e);
    return NextResponse.json({ error: 'failed_to_update_inspection' }, { status: 500 });
  }
}
