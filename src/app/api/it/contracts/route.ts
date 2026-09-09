import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITContractService } from '@/lib/services/it-contract-service';

/** GET /api/it/contracts — list IT contracts */
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
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;

  const contracts = await ITContractService.list(organizationId, { status });
  return NextResponse.json({ contracts });
}

/** POST /api/it/contracts — create an IT contract */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const vendorName = String(body.vendorName || '').trim();
  const title = String(body.title || '').trim();
  if (!vendorName || !title) {
    return NextResponse.json({ error: 'vendorName_and_title_required' }, { status: 400 });
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'dates_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const contract = await ITContractService.create({
      organizationId,
      vendorName,
      contractType: body.contractType,
      title,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      value: body.value,
      currency: body.currency,
      status: body.status,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined,
      terms: body.terms,
      metadata: body.metadata,
      createdBy: session.user.id,
    });
    return NextResponse.json({ contract }, { status: 201 });
  } catch (e) {
    console.error('[it/contracts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_contract' }, { status: 500 });
  }
}
