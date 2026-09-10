import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/responses — list responses */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ responses: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { surveyId?: string; status?: string } = {};
  const surveyId = url.searchParams.get('surveyId');
  const status = url.searchParams.get('status');
  if (surveyId) opts.surveyId = surveyId;
  if (status) opts.status = status;

  const responses = await EngagementService.listResponses(organizationId, opts as never);
  return NextResponse.json({ responses });
}

/** POST /api/engagement/responses — create responses */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const surveyId = String(body.surveyId || '').trim();
  const answers = Array.isArray(body.answers) ? body.answers : null;
  if (!surveyId || !answers) {
    return NextResponse.json({ error: 'surveyId_answers_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  const respondentId = String(body.respondentId || session.user.id);
  try {
    const responses = await Promise.all(
      answers.map((ans: Record<string, unknown>) =>
        EngagementService.createResponse(
          ws.organizationId, ws.id,
          {
            surveyId,
            questionId: ans.questionId as string | undefined,
            respondentId,
            responseValue: ans.responseValue as string | undefined,
            ratingValue: ans.ratingValue as number | undefined,
            comments: ans.comments as string | undefined,
            status: ans.status as never,
          },
          session.user.id,
        ),
      ),
    );
    return NextResponse.json({ responses }, { status: 201 });
  } catch (e) {
    console.error('[engagement/responses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_response' }, { status: 500 });
  }
}
