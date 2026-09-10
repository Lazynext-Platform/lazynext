import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { NonconformanceStatus, NonconformanceSeverity } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/nonconformances — list nonconformances */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const nonconformances = await QualityManagementService.listNonconformances(organizationId, {
    status: (sp.get('status') as NonconformanceStatus) || undefined,
    severity: (sp.get('severity') as NonconformanceSeverity) || undefined,
  });

  return NextResponse.json({ nonconformances });
}

/** POST /api/quality-management/nonconformances — create a nonconformance */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const detectedBy = String(body.detectedBy || '').trim();
  const detectedDate = String(body.detectedDate || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!detectedBy) {
    return NextResponse.json({ error: 'detectedBy_required' }, { status: 400 });
  }
  if (!detectedDate) {
    return NextResponse.json({ error: 'detectedDate_required' }, { status: 400 });
  }

  try {
    const nonconformance = await QualityManagementService.createNonconformance(
      organizationId,
      body.workspaceId || organizationId,
      {
        inspectionId: body.inspectionId,
        title,
        description: body.description,
        severity: body.severity as NonconformanceSeverity | undefined,
        category: body.category,
        detectedBy,
        detectedDate,
        affectedProduct: body.affectedProduct,
        affectedProcess: body.affectedProcess,
      },
      userId,
    );
    return NextResponse.json({ nonconformance }, { status: 201 });
  } catch (e) {
    console.error('[quality-management] create nonconformance error:', e);
    return NextResponse.json({ error: 'failed_to_create_nonconformance' }, { status: 500 });
  }
}
