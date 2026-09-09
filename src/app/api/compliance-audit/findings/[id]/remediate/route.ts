import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** POST /api/compliance-audit/findings/[id]/remediate — remediate a finding */
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
  const resolution = String(body.resolution || '').trim();
  if (!resolution) {
    return NextResponse.json({ error: 'resolution_required' }, { status: 400 });
  }

  try {
    const finding = await ComplianceAuditService.remediateFinding(id, resolution, session.user.id);
    if (!finding) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ finding });
  } catch (e) {
    console.error('[compliance-audit/findings/remediate] error:', e);
    return NextResponse.json({ error: 'failed_to_remediate_finding' }, { status: 500 });
  }
}
