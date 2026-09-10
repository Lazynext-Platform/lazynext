import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommentService } from '@/lib/services/comment-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/comments — list comments for a resource.
 * Query: resourceType, resourceId, sort, includeReplies
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

  const sort = (sp.get('sort') as 'asc' | 'desc') || 'desc';
  const includeReplies = sp.get('includeReplies') === 'true';

  try {
    const comments = await CommentService.list(resourceType, resourceId, { sort, includeReplies });
    return NextResponse.json({ comments });
  } catch (e) {
    console.error('[comments] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_comments' }, { status: 500 });
  }
}

/**
 * POST /api/comments — create a comment.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    resourceType?: string;
    resourceId?: string;
    parentId?: string;
    body?: string;
    mentions?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const resourceType = body.resourceType?.trim();
  const resourceId = body.resourceId?.trim();
  const commentBody = body.body?.trim();

  if (!resourceType || !resourceId) {
    return NextResponse.json({ error: 'resourceType_and_resourceId_required' }, { status: 400 });
  }
  if (!commentBody) {
    return NextResponse.json({ error: 'body_required' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  let organizationId = body.organizationId?.trim();

  // Derive organizationId from workspace membership if not provided.
  if (!organizationId && workspaceId) {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    organizationId = ws.organizationId;
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    const comment = await CommentService.create(organizationId, {
      resourceType: resourceType as 'task' | 'goal' | 'project' | 'document' | 'knowledge' | 'approval' | 'agent',
      resourceId,
      workspaceId,
      parentId: body.parentId?.trim() || undefined,
      body: commentBody,
      mentions: body.mentions || [],
      createdBy: session.user.id,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (e) {
    console.error('[comments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_comment' }, { status: 500 });
  }
}
