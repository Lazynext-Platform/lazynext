import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DripSequenceService } from '@/lib/services/drip-sequence-service';

/** GET /api/email/drip-sequences/[id]/stats — get drip sequence stats and enrollments */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const enrollments = await DripSequenceService.getEnrollments(id);
  return NextResponse.json({ enrollments, count: enrollments.length });
}
