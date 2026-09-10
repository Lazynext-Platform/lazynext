import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InternalAuditService } from '@/lib/services/internal-audit-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const finding = await InternalAuditService.verifyFinding(id, body.reason ?? body.verifiedBy ?? session.user.id);
  if (!finding) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ finding });
}
