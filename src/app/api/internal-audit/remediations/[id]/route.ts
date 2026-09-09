import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InternalAuditService } from '@/lib/services/internal-audit-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const remediation = await InternalAuditService.getRemediation(id);
  if (!remediation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ remediation });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const remediation = await InternalAuditService.updateRemediation(id, body);
    if (!remediation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ remediation });
  } catch (e) {
    console.error('[internal-audit/remediations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_remediation' }, { status: 500 });
  }
}
