import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DealService } from '@/lib/services/crm';
import { WorkspaceService } from '@/lib/services/workspace';
import { TenantGuardService } from '@/lib/services/tenant-guard';

/**
 * GET /api/deals/[id] — get a deal by ID.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const sp = req.nextUrl.searchParams;
  const workspaceIdParam = sp.get('workspaceId') || undefined;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let workspaceId = workspaceIdParam;
  if (workspaceId) {
    const hasAccess = workspaces.some((w) => w.id === workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } else {
    workspaceId = workspaces[0].id;
  }

  const owned = await TenantGuardService.verifyDealOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const deal = await DealService.get(id);
    if (!deal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ deal });
  } catch (e) {
    console.error('[deals] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_deal' }, { status: 500 });
  }
}

/**
 * PATCH /api/deals/[id] — update a deal.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const sp = req.nextUrl.searchParams;
  const workspaceIdParam = sp.get('workspaceId') || undefined;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let workspaceId = workspaceIdParam;
  if (workspaceId) {
    const hasAccess = workspaces.some((w) => w.id === workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } else {
    workspaceId = workspaces[0].id;
  }

  const owned = await TenantGuardService.verifyDealOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: {
    title?: string;
    description?: string;
    stage?: string;
    value?: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: string;
    productId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: 'title_required' }, { status: 400 });
    }
    body.title = title;
  }

  try {
    const existing = await DealService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let expectedCloseDate: Date | null | undefined;
    if (body.expectedCloseDate !== undefined) {
      if (body.expectedCloseDate) {
        const parsed = new Date(body.expectedCloseDate);
        expectedCloseDate = isNaN(parsed.getTime()) ? null : parsed;
      } else {
        expectedCloseDate = null;
      }
    }

    const updated = await DealService.update(id, {
      title: body.title,
      description: body.description?.trim(),
      stage: body.stage?.trim(),
      value: body.value,
      currency: body.currency?.trim(),
      probability: body.probability,
      expectedCloseDate,
      productId: body.productId?.trim(),
    });
    return NextResponse.json({ deal: updated });
  } catch (e) {
    console.error('[deals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_deal' }, { status: 500 });
  }
}
