import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CsatService } from '@/lib/services/csat-service';

/** GET /api/feedback/csat/surveys — list CSAT surveys */
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
  const surveys = await CsatService.listSurveys(organizationId);
  return NextResponse.json({ surveys });
}

/** POST /api/feedback/csat/surveys — create a CSAT survey */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const survey = await CsatService.createSurvey(organizationId, {
      name,
      question: body.question,
      scale: body.scale,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ survey }, { status: 201 });
  } catch (e) {
    console.error('[feedback/csat/surveys] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_survey' }, { status: 500 });
  }
}
