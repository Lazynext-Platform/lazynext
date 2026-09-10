import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IssueCommentService } from '@/lib/services/issue-comment-service';

/** PATCH /api/issues/[id]/comments/[commentId] — update a comment */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { commentId } = params;
  const body = await req.json().catch(() => ({}));
  const content = String(body.content || '').trim();
  if (!content) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  const comment = await IssueCommentService.update(commentId, content);
  if (!comment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ comment });
}

/** DELETE /api/issues/[id]/comments/[commentId] — delete a comment */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; commentId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { commentId } = params;
  const deleted = await IssueCommentService.delete(commentId);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
