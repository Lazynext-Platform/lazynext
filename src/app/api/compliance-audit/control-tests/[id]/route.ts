import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/control-tests/[id] — get a single control test */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const test = await ComplianceAuditService.getControlTest(id);
  if (!test) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ test });
}

/** PATCH /api/compliance-audit/control-tests/[id] — update a control test */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const test = await ComplianceAuditService.updateControlTest(id, {
      testDate: body.testDate, tester: body.tester, method: body.method,
      result: body.result, notes: body.notes, evidenceIds: body.evidenceIds,
    });
    if (!test) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ test });
  } catch (e) {
    console.error('[compliance-audit/control-tests] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_control_test' }, { status: 500 });
  }
}
