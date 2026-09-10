import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';

/**
 * GET /api/governance/dashboard — get the governance dashboard for an organization.
 * Query params: organizationId (required)
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get('organizationId');
  if (!organizationId) {
    return NextResponse.json({ error: 'organization_id_required' }, { status: 400 });
  }

  try {
    const dashboard = await GovernanceService.getGovernanceDashboard(organizationId);
    return NextResponse.json({ dashboard });
  } catch (e) {
    console.error('[governance/dashboard] error:', e);
    return NextResponse.json({ error: 'failed_to_get_dashboard' }, { status: 500 });
  }
}
