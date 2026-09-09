import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerService } from '@/lib/services/crm';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/customers — list customers (query: workspaceId, status, type).
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
  const status = sp.get('status') || undefined;
  const type = sp.get('type') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ customers: [] });
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

    const customers = await CustomerService.list(wsId, { status, type });
    return NextResponse.json({ customers });
  } catch (e) {
    console.error('[customers] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_customers' }, { status: 500 });
  }
}

/**
 * POST /api/customers — create a new customer.
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
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    type?: string;
    status?: string;
    source?: string;
    value?: number;
    currency?: string;
    notes?: string;
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

    const customer = await CustomerService.create({
      organizationId,
      workspaceId,
      name,
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      company: body.company?.trim() || undefined,
      type: body.type?.trim() || undefined,
      status: body.status?.trim() || undefined,
      source: body.source?.trim() || undefined,
      value: body.value,
      currency: body.currency?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    console.error('[customers] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_customer' }, { status: 500 });
  }
}
