import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';

/**
 * GET /api/governance/retention/check — check retention status for an organization.
 * Returns items needing action (data exceeding retention periods).
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
    const items = await GovernanceService.checkRetention(organizationId);
    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    console.error('[governance/retention/check] error:', e);
    return NextResponse.json({ error: 'failed_to_check_retention' }, { status: 500 });
  }
}
