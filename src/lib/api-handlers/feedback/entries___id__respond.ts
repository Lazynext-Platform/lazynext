import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FeedbackService } from '@/lib/services/feedback-service';

/** POST /api/feedback/entries/[id]/respond — respond to feedback */
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
  const response = String(body.response || '').trim();
  if (!response) {
    return NextResponse.json({ error: 'response_required' }, { status: 400 });
  }

  try {
    const feedback = await FeedbackService.respond(id, response, session.user.id);
    return NextResponse.json({ feedback });
  } catch (e) {
    console.error('[feedback/entries/[id]/respond] error:', e);
    return NextResponse.json({ error: 'failed_to_respond' }, { status: 500 });
  }
}
