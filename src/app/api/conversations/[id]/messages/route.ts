import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/conversations/[id]/messages — list messages in a conversation.
 * POST /api/conversations/[id]/messages — send a message.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { workspace: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Verify user is a member of the workspace
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (!workspaces.some((w) => w.id === conversation.workspaceId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user?.name || 'Unknown',
      userImage: m.user?.image || null,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
    conversation,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = body.body?.trim();
  if (!text) {
    return NextResponse.json({ error: 'body_required' }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (!workspaces.some((w) => w.id === conversation.workspaceId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      userId: session.user.id,
      body: text,
    },
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ message }, { status: 201 });
}
