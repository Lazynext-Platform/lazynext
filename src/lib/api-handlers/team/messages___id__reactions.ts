import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MessageService } from '@/lib/services/message-service';

/** POST /api/team/messages/[id]/reactions — add a reaction */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const emoji = String(body.emoji || '').trim();
  if (!emoji) {
    return NextResponse.json({ error: 'emoji_required' }, { status: 400 });
  }

  const added = await MessageService.addReaction(id, session.user.id, emoji);
  return NextResponse.json({ added });
}

/** DELETE /api/team/messages/[id]/reactions — remove a reaction */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const emoji = sp.get('emoji') || '';
  if (!emoji) {
    return NextResponse.json({ error: 'emoji_required' }, { status: 400 });
  }

  const removed = await MessageService.removeReaction(id, session.user.id, emoji);
  return NextResponse.json({ removed });
}
