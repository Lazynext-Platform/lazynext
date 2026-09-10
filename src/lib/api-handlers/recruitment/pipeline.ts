import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** GET /api/recruitment/pipeline — candidates grouped by stage */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ pipeline: {} });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const jobPostingId = url.searchParams.get('jobPostingId') || undefined;

  const pipeline = await RecruitmentService.getHiringPipeline(organizationId, { jobPostingId });
  return NextResponse.json({ pipeline });
}
