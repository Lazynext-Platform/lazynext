import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ToolRegistryService } from '@/lib/services/tool-registry';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/tools — list tools (query: workspaceId).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const tools = await ToolRegistryService.list(workspaceId);
    return NextResponse.json({ tools });
  } catch (e) {
    console.error('[tools] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_tools' }, { status: 500 });
  }
}

/**
 * POST /api/tools — register a new tool.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    name?: string;
    version?: string;
    description?: string;
    inputSchema?: string;
    outputSchema?: string;
    authRequirements?: string;
    permissions?: string[];
    riskCategory?: 'low' | 'medium' | 'high';
    budgetCategory?: 'none' | 'credits' | 'api_cost' | 'compute_cost' | 'ad_spend';
    timeoutSec?: number;
    retryPolicy?: string;
    auditRequired?: boolean;
    allowedAgents?: string[];
    allowedCompanies?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: 'description_required' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const tool = await ToolRegistryService.register({
      workspaceId,
      name,
      version: body.version?.trim() || undefined,
      description,
      inputSchema: body.inputSchema,
      outputSchema: body.outputSchema,
      authRequirements: body.authRequirements,
      permissions: body.permissions,
      riskCategory: body.riskCategory,
      budgetCategory: body.budgetCategory,
      timeoutSec: body.timeoutSec,
      retryPolicy: body.retryPolicy,
      auditRequired: body.auditRequired,
      allowedAgents: body.allowedAgents,
      allowedCompanies: body.allowedCompanies,
    });
    return NextResponse.json({ tool }, { status: 201 });
  } catch (e) {
    console.error('[tools] register error:', e);
    return NextResponse.json({ error: 'failed_to_register_tool' }, { status: 500 });
  }
}
