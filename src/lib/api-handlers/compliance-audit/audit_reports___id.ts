import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/audit-reports/[id] — get a single audit report */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const report = await ComplianceAuditService.getAuditReport(id);
  if (!report) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ report });
}

/** PATCH /api/compliance-audit/audit-reports/[id] — update an audit report */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const report = await ComplianceAuditService.updateAuditReport(id, {
      title: body.title, auditor: body.auditor, startDate: body.startDate,
      endDate: body.endDate, scope: body.scope, summary: body.summary, status: body.status,
    });
    if (!report) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[compliance-audit/audit-reports] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_audit_report' }, { status: 500 });
  }
}
