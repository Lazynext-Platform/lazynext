import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** POST /api/gov-relations/compliance/[id]/file — file a compliance record */
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
  const filingId = String(body.filingId || '').trim();
  if (!filingId) {
    return NextResponse.json({ error: 'filing_id_required' }, { status: 400 });
  }

  try {
    const compliance = await GovRelationsService.fileCompliance(id, filingId, session.user.id);
    if (!compliance) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ compliance });
  } catch (e) {
    console.error('[gov-relations/compliance/file] error:', e);
    return NextResponse.json({ error: 'failed_to_file_compliance' }, { status: 500 });
  }
}
