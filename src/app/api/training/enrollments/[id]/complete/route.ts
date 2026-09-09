import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** POST /api/training/enrollments/[id]/complete — complete an enrollment */
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
  const score = Number(body.score ?? 0);

  try {
    const enrollment = await TrainingService.completeEnrollment(id, score, session.user.id);
    if (!enrollment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ enrollment });
  } catch (e) {
    console.error('[training/enrollments/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_enrollment' }, { status: 500 });
  }
}
