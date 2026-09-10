import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/services/notification-service';

/**
 * GET /api/notifications/[id] — get a single notification.
 * PATCH /api/notifications/[id] — mark read/unread or archive.
 * DELETE /api/notifications/[id] — delete a notification.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Return the raw row — the client parses the body envelope.
  return NextResponse.json({ notification: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = body.action || 'read';
  if (action === 'read') {
    const result = await NotificationService.markAsRead(id);
    if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ notification: result });
  }
  if (action === 'unread') {
    const result = await NotificationService.markAsUnread(id);
    if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ notification: result });
  }
  if (action === 'archive') {
    const result = await NotificationService.archive(id);
    if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ notification: result });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  await NotificationService.delete(id);
  return NextResponse.json({ deleted: true });
}
