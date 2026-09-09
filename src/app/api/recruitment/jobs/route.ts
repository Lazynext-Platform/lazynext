import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** GET /api/recruitment/jobs — list job postings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ jobs: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; department?: string; type?: string; search?: string } = {};
  const status = url.searchParams.get('status');
  const department = url.searchParams.get('department');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  if (status) opts.status = status;
  if (department) opts.department = department;
  if (type) opts.type = type;
  if (search) opts.search = search;

  const jobs = await RecruitmentService.listJobPostings(organizationId, opts);
  return NextResponse.json({ jobs });
}

/** POST /api/recruitment/jobs — create a job posting */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const job = await RecruitmentService.createJobPosting(organizationId, {
      workspaceId: body.workspaceId,
      title,
      department: body.department,
      description: body.description,
      requirements: Array.isArray(body.requirements) ? body.requirements : undefined,
      responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities : undefined,
      location: body.location,
      type: body.type,
      status: body.status,
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
      currency: body.currency,
      hiringManagerId: body.hiringManagerId,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    console.error('[recruitment/jobs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_job' }, { status: 500 });
  }
}
