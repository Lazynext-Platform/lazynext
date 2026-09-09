import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IPService } from '@/lib/services/ip-service';

/** POST /api/ip/disputes/[id]/appeal — appeal an IP dispute */
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
  const appealDetails = String(body.appealDetails || '').trim();
  if (!appealDetails) {
    return NextResponse.json({ error: 'appealDetails_required' }, { status: 400 });
  }

  try {
    const dispute = await IPService.appealDispute(id, appealDetails, session.user.id);
    if (!dispute) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ dispute });
  } catch (e) {
    console.error('[ip/disputes/appeal] error:', e);
    return NextResponse.json({ error: 'failed_to_appeal_dispute' }, { status: 500 });
  }
}
