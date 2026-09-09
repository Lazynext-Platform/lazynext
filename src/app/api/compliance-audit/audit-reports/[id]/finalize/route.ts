import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** POST /api/compliance-audit/audit-reports/[id]/finalize — finalize an audit report */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const findings = Array.isArray(body.findings) ? body.findings : [];
  const conclusion = String(body.conclusion || '').trim();
  if (!conclusion) {
    return NextResponse.json({ error: 'conclusion_required' }, { status: 400 });
  }

  try {
    const report = await ComplianceAuditService.finalizeAuditReport(id, findings, conclusion);
    if (!report) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[compliance-audit/audit-reports/finalize] error:', e);
    return NextResponse.json({ error: 'failed_to_finalize_audit_report' }, { status: 500 });
  }
}
