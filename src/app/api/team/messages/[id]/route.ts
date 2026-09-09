import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MessageService } from '@/lib/services/message-service';

/** GET /api/team/messages/[id] — get a single message */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const message = await MessageService.get(id);
  if (!message) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ message });
}

/** PATCH /api/team/messages/[id] — edit a message */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const newBody = String(body.body || '').trim();
  if (!newBody) {
    return NextResponse.json({ error: 'body_required' }, { status: 400 });
  }

  const message = await MessageService.update(id, newBody);
  if (!message) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ message });
}

/** DELETE /api/team/messages/[id] — delete a message */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await MessageService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
