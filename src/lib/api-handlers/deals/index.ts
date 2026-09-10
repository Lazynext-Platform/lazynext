import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DealService } from '@/lib/services/crm';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/deals — list deals (query: workspaceId, stage).
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
  const stage = sp.get('stage') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ deals: [] });
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

    const deals = await DealService.list(wsId, { stage });
    return NextResponse.json({ deals });
  } catch (e) {
    console.error('[deals] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_deals' }, { status: 500 });
  }
}

/**
 * POST /api/deals — create a new deal.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: {
    organizationId?: string;
    workspaceId?: string;
    customerId?: string;
    productId?: string;
    title?: string;
    description?: string;
    stage?: string;
    value?: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  const customerId = body.customerId?.trim();
  if (!customerId) {
    return NextResponse.json({ error: 'customerId_required' }, { status: 400 });
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

    let expectedCloseDate: Date | undefined;
    if (body.expectedCloseDate) {
      const parsed = new Date(body.expectedCloseDate);
      if (!isNaN(parsed.getTime())) expectedCloseDate = parsed;
    }

    const deal = await DealService.create({
      organizationId,
      workspaceId,
      customerId,
      productId: body.productId?.trim() || undefined,
      title,
      description: body.description?.trim() || undefined,
      stage: body.stage?.trim() || undefined,
      value: body.value,
      currency: body.currency?.trim() || undefined,
      probability: body.probability,
      expectedCloseDate,
      source: body.source?.trim() || undefined,
    });
    return NextResponse.json({ deal }, { status: 201 });
  } catch (e) {
    console.error('[deals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_deal' }, { status: 500 });
  }
}
