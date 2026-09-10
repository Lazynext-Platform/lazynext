import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ responses: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const surveyId = url.searchParams.get('surveyId') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const responses = await EmployeeSurveysService.listResponses(organizationId, { surveyId, status: status as never });
  return NextResponse.json({ responses });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const surveyId = String(body.surveyId || '').trim();
  if (!surveyId) return NextResponse.json({ error: 'surveyId_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const response = await EmployeeSurveysService.createResponse(ws.organizationId, ws.id, {
      surveyId,
      respondentId: body.respondentId, respondentName: body.respondentName,
      status: body.status, submittedDate: body.submittedDate,
      answers: body.answers, score: body.score, sentiment: body.sentiment, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ response }, { status: 201 });
  } catch (e) {
    console.error('[employee-surveys/responses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_response' }, { status: 500 });
  }
}
