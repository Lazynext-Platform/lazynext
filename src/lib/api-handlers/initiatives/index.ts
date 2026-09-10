import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InitiativeService } from '@/lib/services/initiative';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/initiatives — list initiatives (query: workspaceId).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ initiatives: [] });
    }

    let wsId = workspaceId;
    if (wsId) {
      const hasAccess = workspaces.some((w) => w.id === wsId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      wsId = workspaces[0].id;
    }

    const initiatives = await InitiativeService.list(wsId);
    return NextResponse.json({ initiatives });
  } catch (e) {
    console.error('[initiatives] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_initiatives' }, { status: 500 });
  }
}

/**
 * POST /api/initiatives — create a new initiative.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    name?: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    currency?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let organizationId = body.organizationId?.trim();
    let workspaceId = body.workspaceId?.trim();

    if (workspaceId) {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      organizationId = ws.organizationId;
    } else {
      organizationId = organizationId || workspaces[0].organizationId;
      workspaceId = workspaces.find((w) => w.organizationId === organizationId)?.id;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
    }

    let startDate: Date | undefined;
    if (body.startDate) {
      const parsed = new Date(body.startDate);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }
    let endDate: Date | undefined;
    if (body.endDate) {
      const parsed = new Date(body.endDate);
      if (!isNaN(parsed.getTime())) endDate = parsed;
    }

    const initiative = await InitiativeService.create({
      organizationId,
      workspaceId,
      name,
      description: body.description?.trim() || undefined,
      status: body.status?.trim() || undefined,
      priority: body.priority?.trim() || undefined,
      startDate,
      endDate,
      budget: body.budget,
      currency: body.currency?.trim() || undefined,
    });
    return NextResponse.json({ initiative }, { status: 201 });
  } catch (e) {
    console.error('[initiatives] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_initiative' }, { status: 500 });
  }
}
