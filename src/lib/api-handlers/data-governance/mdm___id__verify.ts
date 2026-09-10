import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** POST /api/data-governance/mdm/[id]/verify — verify an MDM record */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const mdmRecord = await DataGovernanceService.verifyMDMRecord(id, session.user.id);
    if (!mdmRecord) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ mdmRecord });
  } catch (e) {
    console.error('[data-governance/mdm/verify] error:', e);
    return NextResponse.json({ error: 'failed_to_verify_record' }, { status: 500 });
  }
}
