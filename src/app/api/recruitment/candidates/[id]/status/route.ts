import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** POST /api/recruitment/candidates/[id]/status — change candidate status */
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
  const status = String(body.status || '').trim();
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }
  try {
    const candidate = await RecruitmentService.changeCandidateStatus(id, status);
    return NextResponse.json({ candidate });
  } catch (e) {
    console.error('[recruitment/candidates/status] error:', e);
    return NextResponse.json({ error: 'failed_to_change_status' }, { status: 500 });
  }
}
