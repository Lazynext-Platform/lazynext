import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/assessments — list assessments (query: organizationId, framework, status) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ assessments: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { framework?: 'GRI'|'SASB'|'TCFD'|'CDP'|'B_Corp'|'custom'; status?: 'pending'|'in_progress'|'completed' } = {};
  const framework = sp.get('framework');
  const status = sp.get('status');
  if (framework) opts.framework = framework as typeof opts.framework;
  if (status) opts.status = status as typeof opts.status;

  const assessments = await SustainabilityService.listAssessments(organizationId, opts);
  return NextResponse.json({ assessments });
}

/** POST /api/sustainability/assessments — create an assessment */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.framework || !body.assessmentDate) {
    return NextResponse.json({ error: 'framework_assessmentDate_required' }, { status: 400 });
  }

  try {
    const assessment = await SustainabilityService.createAssessment(
      organizationId,
      workspaceId,
      {
        framework: body.framework,
        rating: body.rating,
        score: body.score !== undefined ? Number(body.score) : undefined,
        assessor: body.assessor,
        assessmentDate: body.assessmentDate,
        findings: body.findings,
        recommendations: body.recommendations,
        status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (e) {
    console.error('[sustainability/assessments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_assessment' }, { status: 500 });
  }
}
