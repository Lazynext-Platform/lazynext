import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/projects/[id] — get a single project */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const project = await InnovationService.getProject(id);
  if (!project) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ project });
}

/** PATCH /api/innovation/projects/[id] — update a project */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const project = await InnovationService.updateProject(id, {
      ideaId: body.ideaId, name: body.name, description: body.description, category: body.category,
      status: body.status, startDate: body.startDate, endDate: body.endDate, budget: body.budget,
      teamLead: body.teamLead, teamMembers: body.teamMembers, milestones: body.milestones,
      successMetrics: body.successMetrics,
    });
    if (!project) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e) {
    console.error('[innovation/projects] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_project' }, { status: 500 });
  }
}

/** DELETE /api/innovation/projects/[id] — delete a project */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await InnovationService.deleteProject(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[innovation/projects] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_project' }, { status: 500 });
  }
}
