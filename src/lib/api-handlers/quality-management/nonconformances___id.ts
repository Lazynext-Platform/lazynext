import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { NonconformanceStatus, NonconformanceSeverity } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/nonconformances/[id] — get a nonconformance by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const nonconformance = await QualityManagementService.getNonconformance(id);
  if (!nonconformance) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ nonconformance });
}

/** PATCH /api/quality-management/nonconformances/[id] — update a nonconformance */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const nonconformance = await QualityManagementService.updateNonconformance(id, {
      title: body.title,
      description: body.description,
      severity: body.severity as NonconformanceSeverity | undefined,
      category: body.category,
      status: body.status as NonconformanceStatus | undefined,
      affectedProduct: body.affectedProduct,
      affectedProcess: body.affectedProcess,
    });
    if (!nonconformance) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ nonconformance });
  } catch (e) {
    console.error('[quality-management] update nonconformance error:', e);
    return NextResponse.json({ error: 'failed_to_update_nonconformance' }, { status: 500 });
  }
}
