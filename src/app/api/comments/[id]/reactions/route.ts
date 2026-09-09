import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommentService } from '@/lib/services/comment-service';

/**
 * GET /api/comments/[id]/reactions — list reactions for a comment.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const reactions = await CommentService.getReactions(id);
    return NextResponse.json({ reactions });
  } catch (e) {
    console.error('[comments] reactions list error:', e);
    return NextResponse.json({ error: 'failed_to_list_reactions' }, { status: 500 });
  }
}

/**
 * POST /api/comments/[id]/reactions — add a reaction.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { emoji?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const emoji = body.emoji?.trim();
  if (!emoji) {
    return NextResponse.json({ error: 'emoji_required' }, { status: 400 });
  }

  try {
    const added = await CommentService.addReaction(id, session.user.id, emoji);
    return NextResponse.json({ added }, { status: added ? 201 : 200 });
  } catch (e) {
    console.error('[comments] add reaction error:', e);
    return NextResponse.json({ error: 'failed_to_add_reaction' }, { status: 500 });
  }
}

/**
 * DELETE /api/comments/[id]/reactions — remove a reaction.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const sp = req.nextUrl.searchParams;
  const emoji = sp.get('emoji') || undefined;

  if (!emoji) {
    return NextResponse.json({ error: 'emoji_required' }, { status: 400 });
  }

  try {
    const removed = await CommentService.removeReaction(id, session.user.id, emoji);
    return NextResponse.json({ removed });
  } catch (e) {
    console.error('[comments] remove reaction error:', e);
    return NextResponse.json({ error: 'failed_to_remove_reaction' }, { status: 500 });
  }
}
