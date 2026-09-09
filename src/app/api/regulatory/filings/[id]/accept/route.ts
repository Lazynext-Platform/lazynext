import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/filings/[id]/accept — accept a filing */
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
  const acceptanceDate = body.acceptanceDate ? String(body.acceptanceDate) : undefined;

  try {
    const filing = await RegulatoryService.acceptFiling(id, session.user.id, acceptanceDate);
    if (!filing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ filing });
  } catch (e) {
    console.error('[regulatory/filings] accept error:', e);
    return NextResponse.json({ error: 'failed_to_accept_filing' }, { status: 500 });
  }
}
