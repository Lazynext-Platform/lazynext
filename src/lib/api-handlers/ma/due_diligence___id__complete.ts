import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** POST /api/ma/due-diligence/[id]/complete — complete a due diligence record */
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
  const summary = String(body.summary || '').trim();
  if (!summary) {
    return NextResponse.json({ error: 'summary_required' }, { status: 400 });
  }

  try {
    const dd = await MAService.completeDueDiligence(id, summary, session.user.id);
    if (!dd) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ dueDiligence: dd });
  } catch (e) {
    console.error('[ma/due-diligence/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_due_diligence' }, { status: 500 });
  }
}
