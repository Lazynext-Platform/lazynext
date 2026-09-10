import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommentService } from '@/lib/services/comment-service';

/**
 * GET /api/comments/thread — get threaded comments for a resource.
 * Query: resourceType, resourceId
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const resourceType = sp.get('resourceType') || undefined;
  const resourceId = sp.get('resourceId') || undefined;

  if (!resourceType || !resourceId) {
    return NextResponse.json({ error: 'resourceType_and_resourceId_required' }, { status: 400 });
  }

  try {
    const thread = await CommentService.getThread(resourceType, resourceId);
    return NextResponse.json({ thread });
  } catch (e) {
    console.error('[comments] thread error:', e);
    return NextResponse.json({ error: 'failed_to_get_thread' }, { status: 500 });
  }
}
