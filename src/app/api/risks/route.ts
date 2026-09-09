import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RiskService } from '@/lib/services/risk-service';

/** GET /api/risks — list risks for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ risks: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const risks = await RiskService.list(organizationId, {
    category: (sp.get('category') as 'strategic' | 'operational' | 'financial' | 'compliance' | 'security' | 'technology' | 'reputation' | 'external') || undefined,
    status: (sp.get('status') as 'identified' | 'assessed' | 'mitigating' | 'accepted' | 'closed') || undefined,
    riskLevel: (sp.get('riskLevel') as 'low' | 'medium' | 'high' | 'critical') || undefined,
    owner: sp.get('owner') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ risks });
}

/** POST /api/risks — create a new risk */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!body.category) {
    return NextResponse.json({ error: 'category_required' }, { status: 400 });
  }
  if (typeof body.likelihood !== 'number' || typeof body.impact !== 'number') {
    return NextResponse.json({ error: 'likelihood_impact_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const risk = await RiskService.create(organizationId, {
      title,
      description: body.description,
      category: body.category,
      likelihood: body.likelihood,
      impact: body.impact,
      owner: body.owner,
      status: body.status,
      mitigationPlan: body.mitigationPlan,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ risk }, { status: 201 });
  } catch (e) {
    console.error('[risks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_risk' }, { status: 500 });
  }
}
