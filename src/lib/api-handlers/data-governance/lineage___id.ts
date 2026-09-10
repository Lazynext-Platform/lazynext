import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/lineage/[id] — get a single lineage entry */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const lineage = await DataGovernanceService.getLineage(id);
  if (!lineage) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ lineage });
}

/** PATCH /api/data-governance/lineage/[id] — update a lineage entry */
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
    const lineage = await DataGovernanceService.updateLineage(id, {
      name: body.name, source: body.source, target: body.target,
      transformation: body.transformation, schedule: body.schedule,
      status: body.status, dependencies: body.dependencies,
      dataVolume: body.dataVolume, lastUpdated: body.lastUpdated,
    });
    if (!lineage) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ lineage });
  } catch (e) {
    console.error('[data-governance/lineage] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_lineage' }, { status: 500 });
  }
}

/** DELETE /api/data-governance/lineage/[id] — delete a lineage entry */
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
    const ok = await DataGovernanceService.deleteLineage(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data-governance/lineage] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_lineage' }, { status: 500 });
  }
}
