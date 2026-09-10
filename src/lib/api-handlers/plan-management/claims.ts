import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PlanManagementService } from '@/lib/services/plan-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ claims: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['planId', 'enrollmentId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const claims = await PlanManagementService.listClaims(organizationId, opts as never);
  return NextResponse.json({ claims });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId || '').trim();
  const enrollmentId = String(body.enrollmentId || '').trim();
  const employeeId = String(body.employeeId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  if (!planId || !enrollmentId || !employeeId || !employeeName || !type || !amount) return NextResponse.json({ error: 'planId_enrollmentId_employeeId_employeeName_type_amount_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const claim = await PlanManagementService.createClaim(ws.organizationId, ws.id, {
      planId, enrollmentId, employeeId, employeeName, type: type as never, amount,
      currency: body.currency, description: body.description, status: body.status,
      submittedDate: body.submittedDate, processedDate: body.processedDate,
      reference: body.reference, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ claim }, { status: 201 });
  } catch (e) {
    console.error('[plan-management/claims] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_claim' }, { status: 500 });
  }
}
