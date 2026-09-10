import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RoadmapService } from '@/lib/services/product-management-service';

/** GET /api/product/roadmap — list roadmap items */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const quarter = url.searchParams.get('quarter') || undefined;
  const status = url.searchParams.get('status') || undefined;

  const items = await RoadmapService.list(organizationId, { quarter, status });
  return NextResponse.json({ items });
}

/** POST /api/product/roadmap — create a roadmap item */
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
    const item = await RoadmapService.create({
      organizationId,
      featureId: body.featureId,
      title,
      description: body.description,
      quarter: body.quarter,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      dependencies: Array.isArray(body.dependencies) ? body.dependencies : undefined,
      color: body.color,
      position: body.position,
      createdBy: session.user.id,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error('[product/roadmap] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_roadmap_item' }, { status: 500 });
  }
}
