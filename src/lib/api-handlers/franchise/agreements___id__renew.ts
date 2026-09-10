import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** POST /api/franchise/agreements/[id]/renew — renew an agreement */
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
  const newEndDate = String(body.newEndDate || '').trim();
  if (!newEndDate) {
    return NextResponse.json({ error: 'newEndDate_required' }, { status: 400 });
  }

  try {
    const agreement = await FranchiseService.renewAgreement(id, newEndDate, session.user.id);
    if (!agreement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ agreement });
  } catch (e) {
    console.error('[franchise/agreements/renew] error:', e);
    return NextResponse.json({ error: 'failed_to_renew_agreement' }, { status: 500 });
  }
}
