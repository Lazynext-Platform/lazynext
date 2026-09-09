import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FeedbackService } from '@/lib/services/feedback-service';

/** GET /api/feedback/entries/[id]/sentiment — analyze sentiment of feedback */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const sentiment = await FeedbackService.getSentiment(id);
  if (!sentiment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ sentiment });
}
