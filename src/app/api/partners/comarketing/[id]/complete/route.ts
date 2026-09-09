import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PartnerService } from '@/lib/services/partner-service';

/** POST /api/partners/comarketing/[id]/complete — complete a co-marketing campaign */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const results = String(body.results || '').trim();
  if (!results) {
    return NextResponse.json({ error: 'results_required' }, { status: 400 });
  }

  try {
    const comarketing = await PartnerService.completeCoMarketing(id, results, session.user.id);
    if (!comarketing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ comarketing });
  } catch (e) {
    console.error('[partners/comarketing/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_comarketing' }, { status: 500 });
  }
}
