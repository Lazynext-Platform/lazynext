import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/comments?assetId=xxx
 * List comments for an asset (must be owned by authenticated user).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const assetId = url.searchParams.get('assetId');
  if (!assetId) return NextResponse.json({ error: 'assetId_required' }, { status: 400 });

  // Verify ownership
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId: uid } });
  if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const comments = await prisma.creativeComment.findMany({
    where: { assetId },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch user info for each comment
  const userIds = [...new Set(comments.map(c => c.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  return NextResponse.json({
    comments: comments.map(c => ({
      id: c.id,
      userId: c.userId,
      userName: userMap.get(c.userId)?.name || userMap.get(c.userId)?.email || 'Unknown',
      userImage: userMap.get(c.userId)?.image || null,
      assetId: c.assetId,
      parentId: c.parentId,
      body: c.body,
      mentions: JSON.parse(c.mentions || '[]'),
      resolved: c.resolved,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}

/**
 * POST /api/creative/comments
 * Body: { assetId: string, body: string, parentId?: string }
 * Creates a new comment. Extracts @mentions from body.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const assetId = String(body.assetId || '');
  const text = String(body.body || '').trim();
  const parentId = body.parentId ? String(body.parentId) : null;

  if (!assetId) return NextResponse.json({ error: 'assetId_required' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'body_required' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'body_too_long' }, { status: 400 });

  // Verify ownership
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId: uid } });
  if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Verify parent exists if specified
  if (parentId) {
    const parent = await prisma.creativeComment.findFirst({ where: { id: parentId, assetId } });
    if (!parent) return NextResponse.json({ error: 'parent_not_found' }, { status: 404 });
  }

  // Extract @mentions (format: @email or @name)
  const mentionMatches = text.match(/@[\w.+-]+/g) || [];
  const mentionNames = mentionMatches.map(m => m.slice(1));

  // Try to find mentioned users by email or name
  const mentionedUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: mentionNames } },
        { name: { in: mentionNames } },
      ],
    },
    select: { id: true },
  });
  const mentionIds = mentionedUsers.map(u => u.id);

  const comment = await prisma.creativeComment.create({
    data: {
      userId: uid,
      assetId,
      parentId,
      body: text,
      mentions: JSON.stringify(mentionIds),
    },
  });

  return NextResponse.json({
    id: comment.id,
    userId: comment.userId,
    assetId: comment.assetId,
    parentId: comment.parentId,
    body: comment.body,
    mentions: mentionIds,
    resolved: comment.resolved,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  });
}

/**
 * PATCH /api/creative/comments?id=xxx
 * Body: { resolved?: boolean, body?: string }
 * Update a comment (resolve/unresolve or edit body).
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const comment = await prisma.creativeComment.findFirst({ where: { id, userId: uid } });
  if (!comment) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.resolved === 'boolean') data.resolved = body.resolved;
  if (typeof body.body === 'string' && body.body.trim()) {
    data.body = body.body.trim().slice(0, 2000);
    // Re-extract mentions
    const mentionMatches = body.body.match(/@[\w.+-]+/g) || [];
    const mentionNames = mentionMatches.map((m: string) => m.slice(1));
    const mentionedUsers = await prisma.user.findMany({
      where: { OR: [{ email: { in: mentionNames } }, { name: { in: mentionNames } }] },
      select: { id: true },
    });
    data.mentions = JSON.stringify(mentionedUsers.map(u => u.id));
  }

  await prisma.creativeComment.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/creative/comments?id=xxx
 * Delete a comment (must be owned by authenticated user).
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const comment = await prisma.creativeComment.findFirst({ where: { id, userId: uid } });
  if (!comment) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Delete replies first
  await prisma.creativeComment.deleteMany({ where: { parentId: id } });
  await prisma.creativeComment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
