import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** GET /api/recruitment/interviews — list interviews */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ interviews: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { candidateId?: string; status?: string; type?: string; dateStart?: Date; dateEnd?: Date } = {};
  const candidateId = url.searchParams.get('candidateId');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const dateStart = url.searchParams.get('dateStart');
  const dateEnd = url.searchParams.get('dateEnd');
  if (candidateId) opts.candidateId = candidateId;
  if (status) opts.status = status;
  if (type) opts.type = type;
  if (dateStart) opts.dateStart = new Date(dateStart);
  if (dateEnd) opts.dateEnd = new Date(dateEnd);

  const interviews = await RecruitmentService.listInterviews(organizationId, opts);
  return NextResponse.json({ interviews });
}

/** POST /api/recruitment/interviews — create an interview */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const candidateId = String(body.candidateId || '').trim();
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!candidateId || !scheduledAt) {
    return NextResponse.json({ error: 'candidateId_and_scheduledAt_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const interview = await RecruitmentService.createInterview(organizationId, {
      candidateId,
      jobPostingId: body.jobPostingId,
      type: body.type,
      status: body.status,
      scheduledAt,
      duration: body.duration,
      location: body.location,
      interviewerIds: Array.isArray(body.interviewerIds) ? body.interviewerIds : undefined,
    });
    return NextResponse.json({ interview }, { status: 201 });
  } catch (e) {
    console.error('[recruitment/interviews] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_interview' }, { status: 500 });
  }
}
