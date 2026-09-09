import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorService } from '@/lib/services/vendor-service';

/** GET /api/vendors — list vendors for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ vendors: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const vendors = await VendorService.list(organizationId, {
    category: sp.get('category') || undefined,
    status: (sp.get('status') as 'active' | 'inactive' | 'preferred' | 'blocked') || undefined,
    search: sp.get('search') || undefined,
    tags: sp.get('tags') ? sp.get('tags')!.split(',') : undefined,
  });

  return NextResponse.json({ vendors });
}

/** POST /api/vendors — create a new vendor */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const vendor = await VendorService.create(organizationId, {
      name,
      category: body.category,
      status: body.status,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      website: body.website,
      address: body.address,
      taxId: body.taxId,
      paymentTerms: body.paymentTerms,
      notes: body.notes,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (e) {
    console.error('[vendors] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_vendor' }, { status: 500 });
  }
}
