import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/conversations?workspaceId=... — list conversations in a workspace.
 * POST /api/conversations — create a new conversation.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (!workspaces.some((w) => w.id === workspaceId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { workspaceId?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId;
  const title = body.title?.trim();
  if (!workspaceId || !title) {
    return NextResponse.json({ error: 'workspaceId_and_title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (!workspaces.some((w) => w.id === workspaceId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const conversation = await prisma.conversation.create({
    data: {
      workspaceId,
      title: title.slice(0, 200),
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
