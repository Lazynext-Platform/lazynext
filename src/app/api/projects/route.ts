import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

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

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        createdById: session.user.id,
        name,
        description: body.description?.trim() || null,
        status: 'active',
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_create_project' },
      { status: 500 },
    );
  }
}
