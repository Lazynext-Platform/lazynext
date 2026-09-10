import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommentService } from '@/lib/services/comment-service';

/**
 * GET /api/comments/mentions — get comments that mention the current user.
 * Query: workspaceId, limit
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const limitParam = sp.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    const mentions = await CommentService.getMentions(session.user.id, { workspaceId, limit });
    return NextResponse.json({ mentions });
  } catch (e) {
    console.error('[comments] mentions error:', e);
    return NextResponse.json({ error: 'failed_to_get_mentions' }, { status: 500 });
  }
}
