import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TenantAuditService } from '@/lib/services/tenant-audit';

/**
 * GET /api/security/tenant-audit — run a tenant isolation audit across all
 * services and API routes and return the full report.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const report = await TenantAuditService.getAuditReport();
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[security/tenant-audit] error:', e);
    return NextResponse.json({ error: 'failed_to_run_audit' }, { status: 500 });
  }
}
