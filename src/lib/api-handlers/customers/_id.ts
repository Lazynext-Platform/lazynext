import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerService } from '@/lib/services/crm';
import { WorkspaceService } from '@/lib/services/workspace';
import { TenantGuardService } from '@/lib/services/tenant-guard';

/**
 * GET /api/customers/[id] — get a customer by ID.
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

  const owned = await TenantGuardService.verifyCustomerOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const customer = await CustomerService.get(id);
    if (!customer) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (e) {
    console.error('[customers] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_customer' }, { status: 500 });
  }
}

/**
 * PATCH /api/customers/[id] — update a customer.
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

  const owned = await TenantGuardService.verifyCustomerOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: {
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

  if (body.name !== undefined) {
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'name_required' }, { status: 400 });
    }
    body.name = name;
  }

  try {
    const existing = await CustomerService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await CustomerService.update(id, {
      name: body.name,
      email: body.email?.trim(),
      phone: body.phone?.trim(),
      company: body.company?.trim(),
      type: body.type?.trim(),
      status: body.status?.trim(),
      source: body.source?.trim(),
      value: body.value,
      currency: body.currency?.trim(),
      notes: body.notes?.trim(),
    });
    return NextResponse.json({ customer: updated });
  } catch (e) {
    console.error('[customers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_customer' }, { status: 500 });
  }
}
