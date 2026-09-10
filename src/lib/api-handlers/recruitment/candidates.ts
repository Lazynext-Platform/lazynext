import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** GET /api/recruitment/candidates — list candidates */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ candidates: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { jobPostingId?: string; status?: string; source?: string; search?: string; rating?: number } = {};
  const jobPostingId = url.searchParams.get('jobPostingId');
  const status = url.searchParams.get('status');
  const source = url.searchParams.get('source');
  const search = url.searchParams.get('search');
  const rating = url.searchParams.get('rating');
  if (jobPostingId) opts.jobPostingId = jobPostingId;
  if (status) opts.status = status;
  if (source) opts.source = source;
  if (search) opts.search = search;
  if (rating !== null) opts.rating = Number(rating);

  const candidates = await RecruitmentService.listCandidates(organizationId, opts);
  return NextResponse.json({ candidates });
}

/** POST /api/recruitment/candidates — create a candidate */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  if (!name || !email) {
    return NextResponse.json({ error: 'name_and_email_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const candidate = await RecruitmentService.createCandidate(organizationId, {
      workspaceId: body.workspaceId,
      jobPostingId: body.jobPostingId,
      name,
      email,
      phone: body.phone,
      resumeUrl: body.resumeUrl,
      resumeText: body.resumeText,
      linkedinUrl: body.linkedinUrl,
      portfolioUrl: body.portfolioUrl,
      source: body.source,
      status: body.status,
      rating: body.rating,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      notes: body.notes,
    });
    return NextResponse.json({ candidate }, { status: 201 });
  } catch (e) {
    console.error('[recruitment/candidates] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_candidate' }, { status: 500 });
  }
}
