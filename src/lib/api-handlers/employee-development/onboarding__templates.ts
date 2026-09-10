import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OnboardingService } from '@/lib/services/onboarding-service';

/** GET /api/employee-development/onboarding/templates — list onboarding templates */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ templates: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const templates = await OnboardingService.getTemplates(organizationId);
  return NextResponse.json({ templates });
}

/** POST /api/employee-development/onboarding/templates — create an onboarding template */
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

  const ws = workspaces[0];
  try {
    const template = await OnboardingService.createTemplate(
      ws.organizationId,
      ws.id,
      {
        name,
        description: body.description,
        tasks: Array.isArray(body.tasks) ? body.tasks : [],
      },
      session.user.id,
    );
    return NextResponse.json({ template }, { status: 201 });
  } catch (e) {
    console.error('[employee-development/onboarding/templates] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_template' }, { status: 500 });
  }
}
