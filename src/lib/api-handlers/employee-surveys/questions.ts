import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ questions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const surveyId = url.searchParams.get('surveyId') ?? undefined;
  const type = url.searchParams.get('type') ?? undefined;
  const questions = await EmployeeSurveysService.listQuestions(organizationId, { surveyId, type: type as never });
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const surveyId = String(body.surveyId || '').trim();
  const text = String(body.text || '').trim();
  const type = String(body.type || '').trim();
  if (!surveyId || !text || !type) return NextResponse.json({ error: 'surveyId_text_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const question = await EmployeeSurveysService.createQuestion(ws.organizationId, ws.id, {
      surveyId, text, type: type as never,
      required: body.required, options: body.options, scale: body.scale,
      order: body.order, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ question }, { status: 201 });
  } catch (e) {
    console.error('[employee-surveys/questions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_question' }, { status: 500 });
  }
}
