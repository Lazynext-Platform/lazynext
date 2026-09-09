import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorContractService } from '@/lib/services/vendor-contract-service';

/** GET /api/vendors/contracts — list contracts */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ contracts: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const dateRange: { start?: string; end?: string } | undefined =
    sp.get('dateStart') || sp.get('dateEnd')
      ? { start: sp.get('dateStart') || undefined, end: sp.get('dateEnd') || undefined }
      : undefined;

  const contracts = await VendorContractService.list(organizationId, {
    vendorId: sp.get('vendorId') || undefined,
    status: (sp.get('status') as 'active' | 'expired' | 'pending' | 'terminated' | 'renewal') || undefined,
    type: (sp.get('type') as 'service' | 'subscription' | 'one_time' | 'master' | 'nda') || undefined,
    dateRange,
  });

  return NextResponse.json({ contracts });
}

/** POST /api/vendors/contracts — create a contract */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.vendorId || !body.title || !body.contractType || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const contract = await VendorContractService.create(organizationId, {
      vendorId: body.vendorId,
      title: body.title,
      contractType: body.contractType,
      startDate: body.startDate,
      endDate: body.endDate,
      value: Number(body.value) || 0,
      currency: body.currency,
      status: body.status,
      terms: body.terms,
      renewalDate: body.renewalDate,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ contract }, { status: 201 });
  } catch (e) {
    console.error('[vendors/contracts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_contract' }, { status: 500 });
  }
}
