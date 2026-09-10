import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ agreements: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['unitId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const agreements = await FranchiseDevelopmentService.listAgreements(organizationId, opts as never);
  return NextResponse.json({ agreements });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const unitId = String(body.unitId || '').trim();
  const franchiseeName = String(body.franchiseeName || '').trim();
  const type = String(body.type || '').trim();
  if (!unitId || !franchiseeName || !type) return NextResponse.json({ error: 'unitId_franchiseeName_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const agreement = await FranchiseDevelopmentService.createAgreement(ws.organizationId, ws.id, {
      unitId, franchiseeName, type: type as never,
      description: body.description, status: body.status,
      startDate: body.startDate, endDate: body.endDate, territory: body.territory,
      initialFee: body.initialFee, royaltyRate: body.royaltyRate, advertisingFee: body.advertisingFee,
      termYears: body.termYears, renewalTerms: body.renewalTerms, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ agreement }, { status: 201 });
  } catch (e) {
    console.error('[franchise-development/agreements] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_agreement' }, { status: 500 });
  }
}
