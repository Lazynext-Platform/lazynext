import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/surveys — list surveys */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ surveys: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { surveyType?: string; status?: string } = {};
  const surveyType = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (surveyType) opts.surveyType = surveyType;
  if (status) opts.status = status;

  const surveys = await EngagementService.listSurveys(organizationId, opts as never);
  return NextResponse.json({ surveys });
}

/** POST /api/engagement/surveys — create a survey */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const surveyType = String(body.type || body.surveyType || '').trim();
  if (!title || !surveyType) {
    return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const survey = await EngagementService.createSurvey(
      ws.organizationId, ws.id,
      {
        title,
        surveyType: surveyType as never,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status,
        anonymous: body.anonymous,
        targetAudience: body.targetAudience,
        expectedResponses: body.expectedResponses,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ survey }, { status: 201 });
  } catch (e) {
    console.error('[engagement/surveys] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_survey' }, { status: 500 });
  }
}
