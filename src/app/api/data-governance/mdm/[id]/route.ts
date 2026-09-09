import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/mdm/[id] — get a single MDM record */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const mdmRecord = await DataGovernanceService.getMDMRecord(id);
  if (!mdmRecord) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ mdmRecord });
}

/** PATCH /api/data-governance/mdm/[id] — update an MDM record */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const mdmRecord = await DataGovernanceService.updateMDMRecord(id, {
      domain: body.domain, entityName: body.entityName, goldenRecord: body.goldenRecord,
      sourceRecords: body.sourceRecords, status: body.status,
      qualityScore: body.qualityScore, lastVerified: body.lastVerified, verifiedBy: body.verifiedBy,
    });
    if (!mdmRecord) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ mdmRecord });
  } catch (e) {
    console.error('[data-governance/mdm] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_mdm_record' }, { status: 500 });
  }
}

/** DELETE /api/data-governance/mdm/[id] — delete an MDM record */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await DataGovernanceService.deleteMDMRecord(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data-governance/mdm] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_mdm_record' }, { status: 500 });
  }
}
