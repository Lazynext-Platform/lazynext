import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/findings/[id] — get a single finding */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const finding = await ComplianceAuditService.getFinding(id);
  if (!finding) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ finding });
}

/** PATCH /api/compliance-audit/findings/[id] — update a finding */
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
    const finding = await ComplianceAuditService.updateFinding(id, {
      title: body.title, description: body.description, severity: body.severity,
      recommendation: body.recommendation, status: body.status, dueDate: body.dueDate,
    });
    if (!finding) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ finding });
  } catch (e) {
    console.error('[compliance-audit/findings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_finding' }, { status: 500 });
  }
}
