import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';

/**
 * POST /api/governance/checks/run — run all compliance checks for an organization.
 * Body: { organizationId }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { organizationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.organizationId) {
    return NextResponse.json({ error: 'organization_id_required' }, { status: 400 });
  }

  try {
    const checks = await GovernanceService.runAllChecks(body.organizationId);
    return NextResponse.json({ checks, count: checks.length });
  } catch (e) {
    console.error('[governance/checks/run] error:', e);
    return NextResponse.json({ error: 'failed_to_run_checks' }, { status: 500 });
  }
}
