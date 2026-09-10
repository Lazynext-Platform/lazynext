import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/invoices — list invoices (query: status, customerId, type, startDate, endDate).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || undefined;
  const customerId = sp.get('customerId') || undefined;
  const type = sp.get('type') || undefined;
  const startDateStr = sp.get('startDate') || undefined;
  const endDateStr = sp.get('endDate') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ invoices: [] });
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

    const invoices = await FinanceService.listInvoices(organizationId, {
      status,
      customerId,
      type,
      startDate,
      endDate,
    });
    return NextResponse.json({ invoices });
  } catch (e) {
    console.error('[finance/invoices] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_invoices' }, { status: 500 });
  }
}

/**
 * POST /api/finance/invoices — create a new invoice.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    customerId?: string;
    type?: string;
    issueDate?: string;
    dueDate?: string;
    taxRate?: number;
    discountRate?: number;
    currency?: string;
    notes?: string;
    terms?: string;
    lineItems?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      taxRate?: number;
      discountRate?: number;
      category?: string;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.dueDate) {
    return NextResponse.json({ error: 'dueDate_required' }, { status: 400 });
  }
  const dueDate = new Date(body.dueDate);
  if (isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: 'invalid_dueDate' }, { status: 400 });
  }
  if (!body.lineItems || body.lineItems.length === 0) {
    return NextResponse.json({ error: 'lineItems_required' }, { status: 400 });
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

    let issueDate: Date | undefined;
    if (body.issueDate) {
      const parsed = new Date(body.issueDate);
      if (!isNaN(parsed.getTime())) issueDate = parsed;
    }

    const invoice = await FinanceService.createInvoice(organizationId, {
      workspaceId,
      customerId: body.customerId?.trim() || undefined,
      type: body.type?.trim() || undefined,
      issueDate,
      dueDate,
      taxRate: body.taxRate,
      discountRate: body.discountRate,
      currency: body.currency?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      terms: body.terms?.trim() || undefined,
      createdBy: session.user.id,
      lineItems: body.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxRate: li.taxRate,
        discountRate: li.discountRate,
        category: li.category,
      })),
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    console.error('[finance/invoices] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_invoice' }, { status: 500 });
  }
}
