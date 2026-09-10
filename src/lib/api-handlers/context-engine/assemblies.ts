import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ContextEngineService } from '@/lib/services/context-engine-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ assemblies: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const assemblies = await ContextEngineService.listContextAssemblies(organizationId, opts as never);
  return NextResponse.json({ assemblies });
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
    const assembly = await ContextEngineService.createContextAssembly(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description,
      status: body.status,
      agentId: body.agentId,
      taskId: body.taskId,
      snapshotId: body.snapshotId,
      sources: body.sources,
      tokens: body.tokens,
      priority: body.priority,
      assembledAt: body.assembledAt,
      deliveredAt: body.deliveredAt,
      notes: body.notes
    }, session.user.id);
    return NextResponse.json({ assembly }, { status: 201 });
  } catch (e) {
    console.error('[context-engine/assemblies] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_assembly' }, { status: 500 });
  }
}
