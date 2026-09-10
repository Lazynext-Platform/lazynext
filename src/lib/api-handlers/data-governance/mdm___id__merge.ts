import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** POST /api/data-governance/mdm/[id]/merge — merge a source record into an MDM record */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const sourceRecordId = String(body.sourceRecordId || '').trim();
  if (!sourceRecordId) {
    return NextResponse.json({ error: 'sourceRecordId_required' }, { status: 400 });
  }

  try {
    const mdmRecord = await DataGovernanceService.mergeRecords(id, sourceRecordId, session.user.id);
    if (!mdmRecord) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ mdmRecord });
  } catch (e) {
    console.error('[data-governance/mdm/merge] error:', e);
    return NextResponse.json({ error: 'failed_to_merge_record' }, { status: 500 });
  }
}
