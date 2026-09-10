import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { InspectionStatus } from '@/lib/services/quality-management-service';

/** POST /api/quality-management/inspections/[id]/complete — complete an inspection */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const inspection = await QualityManagementService.completeInspection(id, {
      items: Array.isArray(body.items) ? body.items : undefined,
      status: body.status as InspectionStatus | undefined,
      notes: body.notes,
    });
    if (!inspection) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ inspection });
  } catch (e) {
    console.error('[quality-management] complete inspection error:', e);
    return NextResponse.json({ error: 'failed_to_complete_inspection' }, { status: 500 });
  }
}
