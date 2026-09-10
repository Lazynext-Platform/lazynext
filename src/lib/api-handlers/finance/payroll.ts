import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/payroll — list payroll records (query: period, status, employeeId).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const period = sp.get('period') || undefined;
  const status = sp.get('status') || undefined;
  const employeeId = sp.get('employeeId') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ payroll: [] });
    }

    const organizationId = workspaces[0].organizationId;

    const payroll = await FinanceService.listPayroll(organizationId, { period, status, employeeId });
    return NextResponse.json({ payroll });
  } catch (e) {
    console.error('[finance/payroll] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_payroll' }, { status: 500 });
  }
}

/**
 * POST /api/finance/payroll — create a payroll record.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    employeeName?: string;
    employeeId?: string;
    period?: string;
    grossAmount?: number;
    taxWithheld?: number;
    benefits?: number;
    payDate?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const employeeName = body.employeeName?.trim();
  if (!employeeName) {
    return NextResponse.json({ error: 'employeeName_required' }, { status: 400 });
  }
  if (!body.period) {
    return NextResponse.json({ error: 'period_required' }, { status: 400 });
  }
  if (body.grossAmount === undefined || isNaN(body.grossAmount)) {
    return NextResponse.json({ error: 'grossAmount_required' }, { status: 400 });
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

    let payDate: Date | undefined;
    if (body.payDate) {
      const parsed = new Date(body.payDate);
      if (!isNaN(parsed.getTime())) payDate = parsed;
    }

    const record = await FinanceService.createPayroll(organizationId, {
      workspaceId,
      employeeName,
      employeeId: body.employeeId?.trim() || undefined,
      period: body.period,
      grossAmount: body.grossAmount,
      taxWithheld: body.taxWithheld,
      benefits: body.benefits,
      payDate,
    });
    return NextResponse.json({ payroll: record }, { status: 201 });
  } catch (e) {
    console.error('[finance/payroll] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_payroll' }, { status: 500 });
  }
}
