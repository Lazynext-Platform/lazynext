import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/transactions — list transactions (query: workspaceId, type, category, status, startDate, endDate).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const type = sp.get('type') || undefined;
  const category = sp.get('category') || undefined;
  const status = sp.get('status') || undefined;
  const startDateStr = sp.get('startDate') || undefined;
  const endDateStr = sp.get('endDate') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ transactions: [] });
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

    let startDate: Date | undefined;
    if (startDateStr) {
      const parsed = new Date(startDateStr);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }
    let endDate: Date | undefined;
    if (endDateStr) {
      const parsed = new Date(endDateStr);
      if (!isNaN(parsed.getTime())) endDate = parsed;
    }

    const transactions = await FinanceService.list(wsId, { type, category, status, startDate, endDate });
    return NextResponse.json({ transactions });
  } catch (e) {
    console.error('[finance] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_transactions' }, { status: 500 });
  }
}

/**
 * POST /api/finance/transactions — create a new transaction.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    type?: string;
    category?: string;
    amount?: number;
    currency?: string;
    description?: string;
    date?: string;
    status?: string;
    source?: string;
    reference?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const type = body.type?.trim();
  if (!type || !['income', 'expense', 'transfer'].includes(type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }
  const category = body.category?.trim();
  if (!category) {
    return NextResponse.json({ error: 'category_required' }, { status: 400 });
  }
  if (body.amount === undefined || isNaN(body.amount)) {
    return NextResponse.json({ error: 'amount_required' }, { status: 400 });
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

    let date: Date | undefined;
    if (body.date) {
      const parsed = new Date(body.date);
      if (!isNaN(parsed.getTime())) date = parsed;
    }

    const transaction = await FinanceService.create({
      organizationId,
      workspaceId,
      type,
      category,
      amount: body.amount,
      currency: body.currency?.trim() || undefined,
      description: body.description?.trim() || undefined,
      date,
      status: body.status?.trim() || undefined,
      source: body.source?.trim() || undefined,
      reference: body.reference?.trim() || undefined,
      createdBy: session.user.id,
    });
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (e) {
    console.error('[finance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_transaction' }, { status: 500 });
  }
}
