import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/catalog — list catalog entries */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ catalog: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; classification?: string; owner?: string; status?: string } = {};
  const type = url.searchParams.get('type');
  const classification = url.searchParams.get('classification');
  const owner = url.searchParams.get('owner');
  const status = url.searchParams.get('status');
  if (type) opts.type = type;
  if (classification) opts.classification = classification;
  if (owner) opts.owner = owner;
  if (status) opts.status = status;

  const catalog = await DataGovernanceService.listCatalog(organizationId, opts as never);
  return NextResponse.json({ catalog });
}

/** POST /api/data-governance/catalog — create a catalog entry */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const source = String(body.source || '').trim();
  const classification = String(body.classification || '').trim();
  if (!name || !type || !source || !classification) {
    return NextResponse.json({ error: 'name_type_source_classification_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const entry = await DataGovernanceService.createCatalogEntry(
      ws.organizationId, ws.id,
      {
        name, type: type as never, source, classification: classification as never,
        owner: body.owner, description: body.description, tags: body.tags,
        pii: body.pii, refreshFrequency: body.refreshFrequency,
        qualityScore: body.qualityScore, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    console.error('[data-governance/catalog] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_catalog_entry' }, { status: 500 });
  }
}
