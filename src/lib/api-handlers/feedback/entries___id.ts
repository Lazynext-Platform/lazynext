import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FeedbackService } from '@/lib/services/feedback-service';

/** GET /api/feedback/entries/[id] — get a feedback entry */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const feedback = await FeedbackService.get(id);
  if (!feedback) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ feedback });
}

/** PATCH /api/feedback/entries/[id] — update a feedback entry */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const feedback = await FeedbackService.update(id, {
      category: body.category,
      tags: body.tags,
      rating: body.rating,
    });
    return NextResponse.json({ feedback });
  } catch (e) {
    console.error('[feedback/entries/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_feedback' }, { status: 500 });
  }
}

/** DELETE /api/feedback/entries/[id] — delete a feedback entry */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await FeedbackService.delete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[feedback/entries/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_feedback' }, { status: 500 });
  }
}
