import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IssueCommentService } from '@/lib/services/issue-comment-service';

/** GET /api/issues/[id]/comments — list comments for an issue */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const comments = await IssueCommentService.list(id);
  return NextResponse.json({ comments });
}

/** POST /api/issues/[id]/comments — create a comment on an issue */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const content = String(body.content || '').trim();
  if (!content) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const organizationId = workspaces[0]?.organizationId ?? '';

  try {
    const comment = await IssueCommentService.create(organizationId, {
      issueId: id,
      authorId: session.user.id,
      content,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (e) {
    console.error('[issues/comments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_comment' }, { status: 500 });
  }
}
