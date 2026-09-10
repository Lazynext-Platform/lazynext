import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ExpenseServiceV2 } from '@/lib/services/expense-service-v2';

/** GET /api/expenses-v2 — list expenses */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ expenses: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; status?: string; submittedBy?: string; dateStart?: Date; dateEnd?: Date; search?: string } = {};
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const submittedBy = url.searchParams.get('submittedBy');
  const dateStart = url.searchParams.get('dateStart');
  const dateEnd = url.searchParams.get('dateEnd');
  const search = url.searchParams.get('search');
  if (category) opts.category = category;
  if (status) opts.status = status;
  if (submittedBy) opts.submittedBy = submittedBy;
  if (dateStart) opts.dateStart = new Date(dateStart);
  if (dateEnd) opts.dateEnd = new Date(dateEnd);
  if (search) opts.search = search;

  const expenses = await ExpenseServiceV2.list(organizationId, opts);
  return NextResponse.json({ expenses });
}

/** POST /api/expenses-v2 — create an expense */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const vendor = String(body.vendor || '').trim();
  const category = String(body.category || '').trim();
  const amount = Number(body.amount);
  const expenseDate = body.expenseDate ? new Date(body.expenseDate) : null;
  if (!vendor || !category || Number.isNaN(amount) || !expenseDate) {
    return NextResponse.json({ error: 'vendor_category_amount_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const expense = await ExpenseServiceV2.create(organizationId, {
      vendor,
      description: body.description,
      category,
      amount,
      currency: body.currency,
      expenseDate,
      receiptUrl: body.receiptUrl,
      submittedBy: body.submittedBy || session.user.id,
      workspaceId: body.workspaceId,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    console.error('[expenses-v2] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_expense' }, { status: 500 });
  }
}
