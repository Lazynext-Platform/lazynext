import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** GET /api/tax-management — list tax records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ records: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: string; type?: 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst'; status?: 'calculated' | 'filed' | 'paid'; jurisdiction?: string } = {};
  const period = sp.get('period');
  const type = sp.get('type');
  const status = sp.get('status');
  const jurisdiction = sp.get('jurisdiction');
  if (period) opts.period = period;
  if (type) opts.type = type as 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst';
  if (status) opts.status = status as 'calculated' | 'filed' | 'paid';
  if (jurisdiction) opts.jurisdiction = jurisdiction;

  const records = await TaxManagementService.listTaxRecords(organizationId, opts);
  return NextResponse.json({ records });
}

/** POST /api/tax-management — create a tax record */
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
  if (!body.period || !body.type || body.taxableAmount === undefined || body.taxRate === undefined) {
    return NextResponse.json({ error: 'period_type_taxable_rate_required' }, { status: 400 });
  }

  try {
    const record = await TaxManagementService.createTaxRecord(organizationId, {
      period: body.period,
      type: body.type,
      jurisdiction: body.jurisdiction,
      taxableAmount: Number(body.taxableAmount),
      taxRate: Number(body.taxRate),
      taxAmount: body.taxAmount !== undefined ? Number(body.taxAmount) : undefined,
      notes: body.notes,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    console.error('[tax-management] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_tax_record' }, { status: 500 });
  }
}
