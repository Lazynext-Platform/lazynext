import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** GET /api/recruitment/offers — list job offers */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ offers: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { candidateId?: string; status?: string } = {};
  const candidateId = url.searchParams.get('candidateId');
  const status = url.searchParams.get('status');
  if (candidateId) opts.candidateId = candidateId;
  if (status) opts.status = status;

  const offers = await RecruitmentService.listOffers(organizationId, opts);
  return NextResponse.json({ offers });
}

/** POST /api/recruitment/offers — create a job offer */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const candidateId = String(body.candidateId || '').trim();
  const salary = Number(body.salary);
  if (!candidateId || Number.isNaN(salary)) {
    return NextResponse.json({ error: 'candidateId_and_salary_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const offer = await RecruitmentService.createOffer(organizationId, {
      candidateId,
      jobPostingId: body.jobPostingId,
      salary,
      currency: body.currency,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      benefits: body.benefits,
      terms: body.terms,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
    return NextResponse.json({ offer }, { status: 201 });
  } catch (e) {
    console.error('[recruitment/offers] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_offer' }, { status: 500 });
  }
}
