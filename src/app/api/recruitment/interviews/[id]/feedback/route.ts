import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** POST /api/recruitment/interviews/[id]/feedback — add interview feedback */
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
  const feedback = String(body.feedback || '').trim();
  const rating = Number(body.rating);
  if (!feedback || Number.isNaN(rating)) {
    return NextResponse.json({ error: 'feedback_and_rating_required' }, { status: 400 });
  }
  try {
    const interview = await RecruitmentService.addInterviewFeedback(id, feedback, rating);
    return NextResponse.json({ interview });
  } catch (e) {
    console.error('[recruitment/interviews/feedback] error:', e);
    return NextResponse.json({ error: 'failed_to_add_feedback' }, { status: 500 });
  }
}
