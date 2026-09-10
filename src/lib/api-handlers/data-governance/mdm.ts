import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/mdm — list MDM records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ mdmRecords: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { domain?: string; status?: string } = {};
  const domain = url.searchParams.get('domain');
  const status = url.searchParams.get('status');
  if (domain) opts.domain = domain;
  if (status) opts.status = status;

  const mdmRecords = await DataGovernanceService.listMDMRecords(organizationId, opts as never);
  return NextResponse.json({ mdmRecords });
}

/** POST /api/data-governance/mdm — create an MDM record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const domain = String(body.domain || '').trim();
  const entityName = String(body.entityName || '').trim();
  const goldenRecord = body.goldenRecord;
  if (!domain || !entityName || !goldenRecord) {
    return NextResponse.json({ error: 'domain_entityName_goldenRecord_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const mdmRecord = await DataGovernanceService.createMDMRecord(
      ws.organizationId, ws.id,
      {
        domain: domain as never, entityName, goldenRecord,
        sourceRecords: body.sourceRecords, status: body.status,
        qualityScore: body.qualityScore, lastVerified: body.lastVerified, verifiedBy: body.verifiedBy,
      },
      session.user.id,
    );
    return NextResponse.json({ mdmRecord }, { status: 201 });
  } catch (e) {
    console.error('[data-governance/mdm] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_mdm_record' }, { status: 500 });
  }
}
