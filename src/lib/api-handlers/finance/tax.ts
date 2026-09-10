import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/tax — list tax records (query: period, type, status).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const period = sp.get('period') || undefined;
  const type = sp.get('type') || undefined;
  const status = sp.get('status') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ taxRecords: [] });
    }

    const organizationId = workspaces[0].organizationId;

    const taxRecords = await FinanceService.listTaxRecords(organizationId, { period, type, status });
    return NextResponse.json({ taxRecords });
  } catch (e) {
    console.error('[finance/tax] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_tax_records' }, { status: 500 });
  }
}

/**
 * POST /api/finance/tax — calculate tax for a period.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    period?: string;
    type?: string;
    jurisdiction?: string;
    taxableAmount?: number;
    taxRate?: number;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.period) {
    return NextResponse.json({ error: 'period_required' }, { status: 400 });
  }
  if (body.taxableAmount === undefined || isNaN(body.taxableAmount)) {
    return NextResponse.json({ error: 'taxableAmount_required' }, { status: 400 });
  }
  if (body.taxRate === undefined || isNaN(body.taxRate)) {
    return NextResponse.json({ error: 'taxRate_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;

    const record = await FinanceService.calculateTax(organizationId, {
      period: body.period,
      type: body.type?.trim() || undefined,
      jurisdiction: body.jurisdiction?.trim() || undefined,
      taxableAmount: body.taxableAmount,
      taxRate: body.taxRate,
      notes: body.notes?.trim() || undefined,
    });
    return NextResponse.json({ taxRecord: record }, { status: 201 });
  } catch (e) {
    console.error('[finance/tax] create error:', e);
    return NextResponse.json({ error: 'failed_to_calculate_tax' }, { status: 500 });
  }
}
