import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/evidence/[id] — get a single evidence */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const evidence = await ComplianceAuditService.getEvidence(id);
  if (!evidence) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ evidence });
}

/** DELETE /api/compliance-audit/evidence/[id] — delete evidence */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await ComplianceAuditService.deleteEvidence(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[compliance-audit/evidence] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_evidence' }, { status: 500 });
  }
}
