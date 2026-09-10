import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/stats — get aggregate quality stats */
export async function GET(_req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;

  try {
    const stats = await QualityManagementService.getStats(organizationId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[quality-management] stats error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
