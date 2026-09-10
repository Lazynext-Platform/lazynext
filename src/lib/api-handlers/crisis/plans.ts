import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CrisisService } from '@/lib/services/crisis-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ plans: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { crisisType?: string; status?: string } = {};
  const crisisType = url.searchParams.get('crisisType');
  const status = url.searchParams.get('status');
  if (crisisType) opts.crisisType = crisisType;
  if (status) opts.status = status;
  const plans = await CrisisService.listPlans(organizationId, opts as never);
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const crisisType = String(body.crisisType || '').trim();
  if (!name || !crisisType) return NextResponse.json({ error: 'name_crisisType_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const plan = await CrisisService.createPlan(
      ws.organizationId, ws.id,
      {
        name, crisisType: crisisType as never, description: body.description,
        severityThreshold: body.severityThreshold, responseSteps: body.responseSteps,
        escalationMatrix: body.escalationMatrix, communicationProtocol: body.communicationProtocol,
        resourceList: body.resourceList, recoverySteps: body.recoverySteps, status: body.status,
        approvedBy: body.approvedBy, approvedDate: body.approvedDate, version: body.version, lastReviewed: body.lastReviewed,
      },
      session.user.id,
    );
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    console.error('[crisis/plans] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_plan' }, { status: 500 });
  }
}
