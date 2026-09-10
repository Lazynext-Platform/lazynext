import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** POST /api/franchise/franchisees/[id]/terminate — terminate a franchisee */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const franchisee = await FranchiseService.terminateFranchisee(id, reason, session.user.id);
    if (!franchisee) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ franchisee });
  } catch (e) {
    console.error('[franchise/franchisees/terminate] error:', e);
    return NextResponse.json({ error: 'failed_to_terminate_franchisee' }, { status: 500 });
  }
}
