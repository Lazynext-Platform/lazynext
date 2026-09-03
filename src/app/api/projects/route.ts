import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { canCreateProject } from '@/lib/plan-guard';
import { createNotifications } from '@/lib/notifications';

/**
 * Internal project CRUD API (session-auth, not API key).
 * POST /api/projects — create a project in the user's workspace.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { name?: string; description?: string; workspaceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    // Use specified workspace or default to first
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    // Plan limit check
    const guard = await canCreateProject(workspace.id, session.user.id);
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.reason || 'plan_limit_exceeded', limit: guard.limit, current: guard.current, tier: guard.tier },
        { status: 402 },
      );
    }

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        createdById: session.user.id,
        name,
        description: body.description?.trim() || null,
        status: 'active',
      },
    });

    // Notify all workspace members about the new project (except the creator)
    try {
      const members = await prisma.membership.findMany({
        where: { workspaceId: workspace.id, userId: { not: session.user.id } },
        select: { userId: true },
      });
      if (members.length > 0) {
        await createNotifications(
          members.map((m) => ({
            userId: m.userId,
            workspaceId: workspace.id,
            type: 'project_created',
            title: `New project: ${name}`,
            body: body.description?.trim() || undefined,
          })),
        );
      }
    } catch {}

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    console.error('[projects] create error:', e);
    return NextResponse.json(
      { error: 'failed_to_create_project' },
      { status: 500 },
    );
  }
}
