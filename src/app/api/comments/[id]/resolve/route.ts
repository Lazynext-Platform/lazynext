import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommentService } from '@/lib/services/comment-service';

/**
 * POST /api/comments/[id]/resolve — mark a thread as resolved.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const resolved = await CommentService.resolveThread(id, session.user.id);
    if (!resolved) {
      return NextResponse.json({ error: 'already_resolved_or_not_found' }, { status: 409 });
    }
    return NextResponse.json({ resolved: true });
  } catch (e) {
    console.error('[comments] resolve error:', e);
    return NextResponse.json({ error: 'failed_to_resolve_thread' }, { status: 500 });
  }
}

/**
 * DELETE /api/comments/[id]/resolve — unmark a thread as resolved.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const unresolved = await CommentService.unresolveThread(id);
    return NextResponse.json({ unresolved });
  } catch (e) {
    console.error('[comments] unresolve error:', e);
    return NextResponse.json({ error: 'failed_to_unresolve_thread' }, { status: 500 });
  }
}
