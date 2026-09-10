import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MemoryService } from '@/lib/services/memory';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/memories — list memories (query: workspaceId, type).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const type = sp.get('type') || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const memories = await MemoryService.list(workspaceId, {
      type: type as
        | 'fact'
        | 'knowledge'
        | 'decision'
        | 'preference'
        | 'outcome'
        | 'lesson'
        | 'active_context'
        | 'historical_context'
        | undefined,
    });
    return NextResponse.json({ memories });
  } catch (e) {
    console.error('[memories] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_memories' }, { status: 500 });
  }
}

/**
 * POST /api/memories — create a memory.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    organizationId?: string;
    type?: string;
    content?: string;
    source?: string;
    sourceId?: string;
    confidence?: number;
    owner?: string;
    lifecycle?: 'permanent' | 'long' | 'medium' | 'short';
    tags?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  const type = body.type?.trim();
  if (!type) {
    return NextResponse.json({ error: 'type_required' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace and get organizationId
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const organizationId = body.organizationId?.trim() || workspace.organizationId;

    const memory = await MemoryService.create({
      workspaceId,
      organizationId,
      type: type as 'fact' | 'knowledge' | 'decision' | 'preference' | 'outcome' | 'lesson' | 'active_context' | 'historical_context',
      content,
      source: body.source?.trim() || undefined,
      sourceId: body.sourceId?.trim() || undefined,
      confidence: body.confidence,
      owner: body.owner?.trim() || undefined,
      lifecycle: body.lifecycle,
      tags: body.tags,
      createdBy: session.user.id,
    });
    return NextResponse.json({ memory }, { status: 201 });
  } catch (e) {
    console.error('[memories] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_memory' }, { status: 500 });
  }
}
