import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ accounts: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const accounts = await PortfolioManagementService.listAccounts(organizationId, opts as never);
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const account = await PortfolioManagementService.createAccount(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, custodian: body.custodian,
      manager: body.manager, currency: body.currency, currentValue: body.currentValue,
      inceptionDate: body.inceptionDate, benchmark: body.benchmark, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ account }, { status: 201 });
  } catch (e) {
    console.error('[portfolio-management/accounts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_account' }, { status: 500 });
  }
}
