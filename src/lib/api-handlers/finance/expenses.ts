import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/expenses — list expenses (query: status, category, startDate, endDate).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || undefined;
  const category = sp.get('category') || undefined;
  const startDateStr = sp.get('startDate') || undefined;
  const endDateStr = sp.get('endDate') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ expenses: [] });
    }

    const organizationId = workspaces[0].organizationId;

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

    const expenses = await FinanceService.listExpenses(organizationId, {
      status,
      category,
      startDate,
      endDate,
    });
    return NextResponse.json({ expenses });
  } catch (e) {
    console.error('[finance/expenses] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_expenses' }, { status: 500 });
  }
}

/**
 * POST /api/finance/expenses — create a new expense.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    vendor?: string;
    description?: string;
    category?: string;
    amount?: number;
    currency?: string;
    status?: string;
    expenseDate?: string;
    receiptUrl?: string;
    tags?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const vendor = body.vendor?.trim();
  if (!vendor) {
    return NextResponse.json({ error: 'vendor_required' }, { status: 400 });
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

    let expenseDate: Date | undefined;
    if (body.expenseDate) {
      const parsed = new Date(body.expenseDate);
      if (!isNaN(parsed.getTime())) expenseDate = parsed;
    }

    const expense = await FinanceService.createExpense(organizationId, {
      workspaceId,
      vendor,
      description: body.description?.trim() || undefined,
      category: body.category?.trim() || undefined,
      amount: body.amount,
      currency: body.currency?.trim() || undefined,
      status: body.status?.trim() || undefined,
      expenseDate,
      receiptUrl: body.receiptUrl?.trim() || undefined,
      submittedBy: session.user.id,
      tags: body.tags,
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    console.error('[finance/expenses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_expense' }, { status: 500 });
  }
}
