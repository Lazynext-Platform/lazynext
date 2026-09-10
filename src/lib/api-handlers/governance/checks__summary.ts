import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';

/**
 * GET /api/governance/checks/summary — get compliance summary for an organization.
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
    const summary = await GovernanceService.getComplianceSummary(organizationId);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[governance/checks/summary] error:', e);
    return NextResponse.json({ error: 'failed_to_get_summary' }, { status: 500 });
  }
}
