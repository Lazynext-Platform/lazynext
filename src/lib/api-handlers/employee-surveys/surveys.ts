import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ surveys: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const surveys = await EmployeeSurveysService.listSurveys(organizationId, { type: type as never, status: status as never });
  return NextResponse.json({ surveys });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const survey = await EmployeeSurveysService.createSurvey(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status, anonymous: body.anonymous,
      startDate: body.startDate, endDate: body.endDate,
      targetCount: body.targetCount, responseCount: body.responseCount,
      questions: body.questions, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ survey }, { status: 201 });
  } catch (e) {
    console.error('[employee-surveys/surveys] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_survey' }, { status: 500 });
  }
}
