import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommentService } from '@/lib/services/comment-service';

/**
 * GET /api/comments/[id] — get a single comment.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const comment = await CommentService.get(id);
    if (!comment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ comment });
  } catch (e) {
    console.error('[comments] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_comment' }, { status: 500 });
  }
}

/**
 * PATCH /api/comments/[id] — update a comment body.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const newBody = body.body?.trim();
  if (!newBody) {
    return NextResponse.json({ error: 'body_required' }, { status: 400 });
  }

  try {
    const comment = await CommentService.update(id, newBody, session.user.id);
    if (!comment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ comment });
  } catch (e) {
    console.error('[comments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_comment' }, { status: 500 });
  }
}

/**
 * DELETE /api/comments/[id] — delete a comment and its replies.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await CommentService.delete(id);
    if (!result.deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, repliesDeleted: result.repliesDeleted });
  } catch (e) {
    console.error('[comments] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_comment' }, { status: 500 });
  }
}
