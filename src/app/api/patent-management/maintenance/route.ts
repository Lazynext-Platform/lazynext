import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ maintenance: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['applicationId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const maintenance = await PatentManagementService.listMaintenance(organizationId, opts as never);
  return NextResponse.json({ maintenance });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.applicationId || '').trim();
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  if (!applicationId || !type || !amount) return NextResponse.json({ error: 'applicationId_type_amount_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const maintenance = await PatentManagementService.createMaintenance(ws.organizationId, ws.id, {
      applicationId, type: type as never, amount,
      currency: body.currency, status: body.status,
      dueDate: body.dueDate, paidDate: body.paidDate,
      jurisdiction: body.jurisdiction, description: body.description, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ maintenance }, { status: 201 });
  } catch (e) {
    console.error('[patent-management/maintenance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_maintenance' }, { status: 500 });
  }
}
