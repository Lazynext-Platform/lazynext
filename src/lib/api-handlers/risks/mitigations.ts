import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RiskMitigationService } from '@/lib/services/risk-mitigation-service';

/** GET /api/risks/mitigations — list mitigations */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ mitigations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const mitigations = await RiskMitigationService.list(organizationId, {
    riskId: sp.get('riskId') || undefined,
    status: (sp.get('status') as 'planned' | 'in_progress' | 'completed' | 'cancelled') || undefined,
    type: (sp.get('type') as 'preventive' | 'corrective' | 'detective' | 'compensating') || undefined,
    owner: sp.get('owner') || undefined,
  });

  return NextResponse.json({ mitigations });
}

/** POST /api/risks/mitigations — create a mitigation */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '').trim();
  if (!action) {
    return NextResponse.json({ error: 'action_required' }, { status: 400 });
  }
  if (!body.riskId) {
    return NextResponse.json({ error: 'riskId_required' }, { status: 400 });
  }
  if (!body.type) {
    return NextResponse.json({ error: 'type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const mitigation = await RiskMitigationService.create(organizationId, {
      riskId: body.riskId,
      action,
      type: body.type,
      owner: body.owner,
      dueDate: body.dueDate,
      status: body.status,
      cost: body.cost,
      effectiveness: body.effectiveness,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ mitigation }, { status: 201 });
  } catch (e) {
    console.error('[risks/mitigations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_mitigation' }, { status: 500 });
  }
}
