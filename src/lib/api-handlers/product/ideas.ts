import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FeatureIdeaService } from '@/lib/services/product-management-service';

/** GET /api/product/ideas — list feature ideas */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ ideas: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: { status?: string; priority?: string; category?: string; search?: string } = {};
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (category) filters.category = category;
  if (search) filters.search = search;

  const ideas = await FeatureIdeaService.list(organizationId, filters);
  return NextResponse.json({ ideas });
}

/** POST /api/product/ideas — create a feature idea */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const idea = await FeatureIdeaService.create({
      organizationId,
      workspaceId: body.workspaceId || undefined,
      title,
      description: body.description,
      category: body.category,
      status: body.status,
      priority: body.priority,
      impact: body.impact,
      effort: body.effort,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      assignedToId: body.assignedToId,
      releaseId: body.releaseId,
      submittedById: session.user.id,
      estimatedValue: body.estimatedValue,
    });
    return NextResponse.json({ idea }, { status: 201 });
  } catch (e) {
    console.error('[product/ideas] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_idea' }, { status: 500 });
  }
}
