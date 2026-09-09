import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/submissions/[id]/submit — submit a regulatory document */
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
    const submission = await RegulatoryService.submitRegulatoryDocument(id, session.user.id);
    if (!submission) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ submission });
  } catch (e) {
    console.error('[regulatory/submissions] submit error:', e);
    return NextResponse.json({ error: 'failed_to_submit_document' }, { status: 500 });
  }
}
