import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { canCreateDocument } from '@/lib/plan-guard';

/**
 * Internal document CRUD API (session-auth).
 * POST /api/documents — create a document in a workspace.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { title?: string; content?: string; workspaceId?: string; projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    // Plan limit check
    const guard = await canCreateDocument(workspace.id, session.user.id);
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.reason || 'plan_limit_exceeded', limit: guard.limit, current: guard.current, tier: guard.tier },
        { status: 402 },
      );
    }

    // If projectId provided, verify it belongs to the workspace
    let projectId: string | null = null;
    if (body.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: body.projectId, workspaceId: workspace.id, deletedAt: null },
      });
      if (project) projectId = body.projectId;
    }

    const doc = await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        createdById: session.user.id,
        projectId,
        title: title.slice(0, 200),
        content: typeof body.content === 'string' ? body.content.slice(0, 500_000) : '',
        version: 1,
      },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e) {
    console.error('[documents] create error:', e);
    return NextResponse.json(
      { error: 'failed_to_create_document' },
      { status: 500 },
    );
  }
}
