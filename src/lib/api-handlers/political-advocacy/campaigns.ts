import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ campaigns: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'issueArea']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const campaigns = await PoliticalAdvocacyService.listCampaigns(organizationId, opts as never);
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
    const campaign = await PoliticalAdvocacyService.createCampaign(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, issueArea: body.issueArea,
      targetOfficial: body.targetOfficial, targetBody: body.targetBody,
      startDate: body.startDate, endDate: body.endDate,
      budget: body.budget, coordinator: body.coordinator,
      participants: body.participants, talkingPoints: body.talkingPoints, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    console.error('[political-advocacy/campaigns] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_campaign' }, { status: 500 });
  }
}
