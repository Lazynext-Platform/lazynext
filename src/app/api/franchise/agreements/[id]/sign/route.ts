import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** POST /api/franchise/agreements/[id]/sign — sign an agreement */
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
  const signedBy = String(body.signedBy || '').trim();
  if (!signedBy) {
    return NextResponse.json({ error: 'signedBy_required' }, { status: 400 });
  }

  try {
    const agreement = await FranchiseService.signAgreement(id, signedBy);
    if (!agreement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ agreement });
  } catch (e) {
    console.error('[franchise/agreements/sign] error:', e);
    return NextResponse.json({ error: 'failed_to_sign_agreement' }, { status: 500 });
  }
}
