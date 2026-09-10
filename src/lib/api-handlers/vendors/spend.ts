import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorSpendService } from '@/lib/services/vendor-spend-service';

/** GET /api/vendors/spend — list spend records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ spends: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const dateRange: { start?: string; end?: string } | undefined =
    sp.get('dateStart') || sp.get('dateEnd')
      ? { start: sp.get('dateStart') || undefined, end: sp.get('dateEnd') || undefined }
      : undefined;

  const spends = await VendorSpendService.list(organizationId, {
    vendorId: sp.get('vendorId') || undefined,
    category: sp.get('category') || undefined,
    dateRange,
    minAmount: sp.get('minAmount') ? Number(sp.get('minAmount')) : undefined,
  });

  return NextResponse.json({ spends });
}

/** POST /api/vendors/spend — record spend */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.vendorId || body.amount == null) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const spend = await VendorSpendService.create(organizationId, {
      vendorId: body.vendorId,
      amount: Number(body.amount),
      currency: body.currency,
      category: body.category,
      date: body.date,
      description: body.description,
      invoiceNumber: body.invoiceNumber,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ spend }, { status: 201 });
  } catch (e) {
    console.error('[vendors/spend] create error:', e);
    return NextResponse.json({ error: 'failed_to_record_spend' }, { status: 500 });
  }
}
