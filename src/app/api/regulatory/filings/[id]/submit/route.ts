import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/filings/[id]/submit — submit a filing */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const filing = await RegulatoryService.submitFiling(id, session.user.id);
    if (!filing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ filing });
  } catch (e) {
    console.error('[regulatory/filings] submit error:', e);
    return NextResponse.json({ error: 'failed_to_submit_filing' }, { status: 500 });
  }
}
