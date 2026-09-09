import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ToolRegistryService } from '@/lib/services/tool-registry';
import { WorkspaceService } from '@/lib/services/workspace';
import { TenantGuardService } from '@/lib/services/tenant-guard';

/**
 * GET /api/tools/[id] — get a tool by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const sp = req.nextUrl.searchParams;
  const workspaceIdParam = sp.get('workspaceId') || undefined;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let workspaceId = workspaceIdParam;
  if (workspaceId) {
    const hasAccess = workspaces.some((w) => w.id === workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } else {
    workspaceId = workspaces[0].id;
  }

  const owned = await TenantGuardService.verifyToolOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const tool = await ToolRegistryService.get(id);
    if (!tool) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ tool });
  } catch (e) {
    console.error('[tools] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_tool' }, { status: 500 });
  }
}

/**
 * PATCH /api/tools/[id] — update a tool definition.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const sp = req.nextUrl.searchParams;
  const workspaceIdParam = sp.get('workspaceId') || undefined;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let workspaceId = workspaceIdParam;
  if (workspaceId) {
    const hasAccess = workspaces.some((w) => w.id === workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } else {
    workspaceId = workspaces[0].id;
  }

  const owned = await TenantGuardService.verifyToolOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: {
    description?: string;
    riskCategory?: 'low' | 'medium' | 'high';
    budgetCategory?: 'none' | 'credits' | 'api_cost' | 'compute_cost' | 'ad_spend';
    timeoutSec?: number;
    enabled?: boolean;
    allowedAgents?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    // Verify the tool exists
    const existing = await ToolRegistryService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await ToolRegistryService.update(id, {
      description: body.description?.trim(),
      riskCategory: body.riskCategory,
      budgetCategory: body.budgetCategory,
      timeoutSec: body.timeoutSec,
      enabled: body.enabled,
      allowedAgents: body.allowedAgents,
    });
    return NextResponse.json({ tool: updated });
  } catch (e) {
    console.error('[tools] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_tool' }, { status: 500 });
  }
}
