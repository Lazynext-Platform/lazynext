import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/projects — list projects */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ projects: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; status?: string; teamLead?: string } = {};
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const teamLead = url.searchParams.get('teamLead');
  if (category) opts.category = category;
  if (status) opts.status = status;
  if (teamLead) opts.teamLead = teamLead;

  const projects = await InnovationService.listProjects(organizationId, opts as never);
  return NextResponse.json({ projects });
}

/** POST /api/innovation/projects — create a project */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const status = String(body.status || '').trim();
  if (!name || !category || !status) {
    return NextResponse.json({ error: 'name_category_status_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const project = await InnovationService.createProject(
      ws.organizationId, ws.id,
      {
        name, category: category as never, status: status as never,
        ideaId: body.ideaId, description: body.description, startDate: body.startDate,
        endDate: body.endDate, budget: body.budget, teamLead: body.teamLead,
        teamMembers: body.teamMembers, milestones: body.milestones, successMetrics: body.successMetrics,
      },
      session.user.id,
    );
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    console.error('[innovation/projects] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_project' }, { status: 500 });
  }
}
