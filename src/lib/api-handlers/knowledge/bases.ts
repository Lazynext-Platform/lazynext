import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/knowledge/bases — list knowledge bases (query: workspaceId).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const knowledgeBases = await KnowledgeService.listKnowledgeBases(workspaceId);
    return NextResponse.json({ knowledgeBases });
  } catch (e) {
    console.error('[knowledge/bases] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_knowledge_bases' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge/bases — create a knowledge base.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: {
    workspaceId?: string;
    organizationId?: string;
    name?: string;
    description?: string;
    visibility?: 'workspace' | 'private' | 'shared';
    tags?: string[];
    metadata?: Record<string, unknown>;
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

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const organizationId = body.organizationId?.trim() || workspace.organizationId;

    const knowledgeBase = await KnowledgeService.createKnowledgeBase(workspaceId, {
      organizationId,
      name,
      description: body.description?.trim() || undefined,
      visibility: body.visibility,
      ownerId: session.user.id,
      tags: body.tags,
      metadata: body.metadata,
    });
    return NextResponse.json({ knowledgeBase }, { status: 201 });
  } catch (e) {
    console.error('[knowledge/bases] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_knowledge_base' }, { status: 500 });
  }
}
