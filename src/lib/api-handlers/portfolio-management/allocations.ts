import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ allocations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['accountId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const allocations = await PortfolioManagementService.listAllocations(organizationId, opts as never);
  return NextResponse.json({ allocations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const accountId = String(body.accountId || '').trim();
  const type = String(body.type || '').trim();
  if (!accountId || !type) return NextResponse.json({ error: 'accountId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const allocation = await PortfolioManagementService.createAllocation(ws.organizationId, ws.id, {
      accountId, type: type as never,
      description: body.description, status: body.status, targetWeights: body.targetWeights,
      actualWeights: body.actualWeights, driftThreshold: body.driftThreshold,
      lastRebalanceDate: body.lastRebalanceDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ allocation }, { status: 201 });
  } catch (e) {
    console.error('[portfolio-management/allocations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_allocation' }, { status: 500 });
  }
}
