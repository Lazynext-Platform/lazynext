import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/revenue — list revenue recognitions (query: period, type, status).
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
      return NextResponse.json({ revenue: [] });
    }

    const organizationId = workspaces[0].organizationId;

    const revenue = await FinanceService.listRevenue(organizationId, { period, type, status });
    return NextResponse.json({ revenue });
  } catch (e) {
    console.error('[finance/revenue] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_revenue' }, { status: 500 });
  }
}

/**
 * POST /api/finance/revenue — recognize revenue for a period.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    invoiceId?: string;
    amount?: number;
    recognizedDate?: string;
    period?: string;
    type?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.amount === undefined || isNaN(body.amount)) {
    return NextResponse.json({ error: 'amount_required' }, { status: 400 });
  }
  if (!body.period) {
    return NextResponse.json({ error: 'period_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;

    let recognizedDate: Date | undefined;
    if (body.recognizedDate) {
      const parsed = new Date(body.recognizedDate);
      if (!isNaN(parsed.getTime())) recognizedDate = parsed;
    }

    const record = await FinanceService.recognizeRevenue(organizationId, {
      invoiceId: body.invoiceId?.trim() || undefined,
      amount: body.amount,
      recognizedDate,
      period: body.period,
      type: body.type?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    });
    return NextResponse.json({ revenue: record }, { status: 201 });
  } catch (e) {
    console.error('[finance/revenue] create error:', e);
    return NextResponse.json({ error: 'failed_to_recognize_revenue' }, { status: 500 });
  }
}
