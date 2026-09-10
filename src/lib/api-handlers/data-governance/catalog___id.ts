import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/catalog/[id] — get a single catalog entry */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const entry = await DataGovernanceService.getCatalogEntry(id);
  if (!entry) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

/** PATCH /api/data-governance/catalog/[id] — update a catalog entry */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const entry = await DataGovernanceService.updateCatalogEntry(id, {
      name: body.name, type: body.type, source: body.source, owner: body.owner,
      description: body.description, tags: body.tags, classification: body.classification,
      pii: body.pii, refreshFrequency: body.refreshFrequency, qualityScore: body.qualityScore,
      status: body.status,
    });
    if (!entry) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (e) {
    console.error('[data-governance/catalog] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_catalog_entry' }, { status: 500 });
  }
}

/** DELETE /api/data-governance/catalog/[id] — delete a catalog entry */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await DataGovernanceService.deleteCatalogEntry(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data-governance/catalog] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_catalog_entry' }, { status: 500 });
  }
}
