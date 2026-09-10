import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ phases: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['productId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const phases = await ProductLifecycleService.listPhases(organizationId, opts as never);
  return NextResponse.json({ phases });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || '').trim();
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!productId || !name || !type) return NextResponse.json({ error: 'productId_name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const phase = await ProductLifecycleService.createPhase(ws.organizationId, ws.id, {
      productId, name, type: type as never,
      description: body.description, status: body.status,
      startDate: body.startDate, endDate: body.endDate, owner: body.owner,
      deliverables: body.deliverables, dependencies: body.dependencies,
      milestones: body.milestones, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ phase }, { status: 201 });
  } catch (e) {
    console.error('[product-lifecycle/phases] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_phase' }, { status: 500 });
  }
}
