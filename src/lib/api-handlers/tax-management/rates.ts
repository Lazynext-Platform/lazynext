import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** GET /api/tax-management/rates — get tax rates for a jurisdiction */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ rates: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const jurisdiction = sp.get('jurisdiction') || '';

  const rates = await TaxManagementService.getTaxRates(organizationId, jurisdiction);
  return NextResponse.json({ rates });
}

/** POST /api/tax-management/rates — set a tax rate */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.jurisdiction || !body.type || body.rate === undefined) {
    return NextResponse.json({ error: 'jurisdiction_type_rate_required' }, { status: 400 });
  }

  try {
    const rate = await TaxManagementService.setTaxRate(
      organizationId,
      workspaceId,
      {
        jurisdiction: body.jurisdiction,
        type: body.type,
        rate: Number(body.rate),
        effectiveDate: body.effectiveDate,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ rate }, { status: 201 });
  } catch (e) {
    console.error('[tax-management] set rate error:', e);
    return NextResponse.json({ error: 'failed_to_set_tax_rate' }, { status: 500 });
  }
}
