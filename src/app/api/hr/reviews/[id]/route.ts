import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PerformanceReviewService } from '@/lib/services/performance-review-service';

/** GET /api/hr/reviews/[id] — get a single performance review */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const review = await PerformanceReviewService.get(id);
  if (!review) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ review });
}

/** PATCH /api/hr/reviews/[id] — update a performance review */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const review = await PerformanceReviewService.update(id, {
      reviewPeriod: body.reviewPeriod,
      type: body.type,
      goals: body.goals,
      competencies: body.competencies,
      overallRating: body.overallRating,
      strengths: body.strengths,
      improvements: body.improvements,
      comments: body.comments,
      reviewerComments: body.reviewerComments,
    });
    return NextResponse.json({ review });
  } catch (e) {
    console.error('[hr/reviews] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_review' }, { status: 500 });
  }
}

/** DELETE /api/hr/reviews/[id] — delete a performance review */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await PerformanceReviewService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[hr/reviews] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_review' }, { status: 500 });
  }
}
