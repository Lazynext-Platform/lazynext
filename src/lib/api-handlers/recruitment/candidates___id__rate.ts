import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** POST /api/recruitment/candidates/[id]/rate — rate a candidate */
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
  const rating = Number(body.rating);
  if (Number.isNaN(rating)) {
    return NextResponse.json({ error: 'rating_required' }, { status: 400 });
  }
  try {
    const candidate = await RecruitmentService.rateCandidate(id, rating);
    return NextResponse.json({ candidate });
  } catch (e) {
    console.error('[recruitment/candidates/rate] error:', e);
    return NextResponse.json({ error: 'failed_to_rate_candidate' }, { status: 500 });
  }
}
