import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceReviewService } from '@/lib/services/performance-review-service';

/** GET /api/hr/reviews — list performance reviews */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ reviews: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const { searchParams } = new URL(req.url);
  const filters: Record<string, string | undefined> = {};
  const employeeId = searchParams.get('employeeId') || undefined;
  const reviewerId = searchParams.get('reviewerId') || undefined;
  const status = searchParams.get('status') || undefined;
  const period = searchParams.get('period') || undefined;
  if (employeeId) filters.employeeId = employeeId;
  if (reviewerId) filters.reviewerId = reviewerId;
  if (status) filters.status = status;
  if (period) filters.period = period;

  const reviews = await PerformanceReviewService.list(organizationId, filters);
  return NextResponse.json({ reviews });
}

/** POST /api/hr/reviews — create a performance review */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || '').trim();
  const reviewerId = String(body.reviewerId || '').trim();
  if (!employeeId || !reviewerId) {
    return NextResponse.json({ error: 'employee_and_reviewer_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const review = await PerformanceReviewService.create({
      organizationId,
      employeeId,
      reviewerId,
      reviewPeriod: body.reviewPeriod,
      type: body.type,
      goals: body.goals,
      competencies: body.competencies,
      overallRating: body.overallRating,
      strengths: body.strengths,
      improvements: body.improvements,
      comments: body.comments,
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (e) {
    console.error('[hr/reviews] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_review' }, { status: 500 });
  }
}
