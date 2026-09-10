import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/questions — list questions */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { surveyId?: string; questionType?: string } = {};
  const surveyId = url.searchParams.get('surveyId');
  const questionType = url.searchParams.get('type');
  if (surveyId) opts.surveyId = surveyId;
  if (questionType) opts.questionType = questionType;

  const questions = await EngagementService.listQuestions(organizationId, opts as never);
  return NextResponse.json({ questions });
}

/** POST /api/engagement/questions — create a question */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const surveyId = String(body.surveyId || '').trim();
  const questionText = String(body.question || body.questionText || '').trim();
  const questionType = String(body.type || body.questionType || '').trim();
  if (!surveyId || !questionText || !questionType) {
    return NextResponse.json({ error: 'surveyId_question_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const question = await EngagementService.createQuestion(
      ws.organizationId, ws.id,
      {
        surveyId,
        questionText,
        questionType: questionType as never,
        options: body.options,
        required: body.required,
        order: body.order,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ question }, { status: 201 });
  } catch (e) {
    console.error('[engagement/questions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_question' }, { status: 500 });
  }
}
