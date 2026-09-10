import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PerformanceReviewService } from '@/lib/services/performance-review-service';

/** POST /api/hr/reviews/[id]/complete — complete a performance review */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const review = await PerformanceReviewService.complete(id);
    return NextResponse.json({ review });
  } catch (e) {
    console.error('[hr/reviews] complete error:', e);
    return NextResponse.json({ error: 'failed_to_complete_review' }, { status: 500 });
  }
}
