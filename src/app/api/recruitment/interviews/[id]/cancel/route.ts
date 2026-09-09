import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** POST /api/recruitment/interviews/[id]/cancel — cancel an interview */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const interview = await RecruitmentService.cancelInterview(id);
    return NextResponse.json({ interview });
  } catch (e) {
    console.error('[recruitment/interviews/cancel] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_interview' }, { status: 500 });
  }
}
