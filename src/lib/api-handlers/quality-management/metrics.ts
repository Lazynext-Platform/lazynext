import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/metrics — get quality metrics */
export async function GET(_req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;

  try {
    const metrics = await QualityManagementService.getQualityMetrics(organizationId);
    return NextResponse.json({ metrics });
  } catch (e) {
    console.error('[quality-management] metrics error:', e);
    return NextResponse.json({ error: 'failed_to_get_metrics' }, { status: 500 });
  }
}
