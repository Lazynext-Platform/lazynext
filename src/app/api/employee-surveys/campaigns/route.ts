import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ campaigns: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const campaigns = await EmployeeSurveysService.listCampaigns(organizationId, { type: type as never, status: status as never });
  return NextResponse.json({ campaigns });
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
    const campaign = await EmployeeSurveysService.createCampaign(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, surveyIds: body.surveyIds,
      startDate: body.startDate, endDate: body.endDate,
      targetAudience: body.targetAudience, participationRate: body.participationRate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    console.error('[employee-surveys/campaigns] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_campaign' }, { status: 500 });
  }
}
