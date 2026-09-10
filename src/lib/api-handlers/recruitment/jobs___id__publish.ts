import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** POST /api/recruitment/jobs/[id]/publish — publish a job posting */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const job = await RecruitmentService.publishJobPosting(id);
    return NextResponse.json({ job });
  } catch (e) {
    console.error('[recruitment/jobs/publish] error:', e);
    return NextResponse.json({ error: 'failed_to_publish_job' }, { status: 500 });
  }
}
