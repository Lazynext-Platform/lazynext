import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** POST /api/franchise/agreements/[id]/terminate — terminate an agreement */
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
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const agreement = await FranchiseService.terminateAgreement(id, reason, session.user.id);
    if (!agreement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ agreement });
  } catch (e) {
    console.error('[franchise/agreements/terminate] error:', e);
    return NextResponse.json({ error: 'failed_to_terminate_agreement' }, { status: 500 });
  }
}
