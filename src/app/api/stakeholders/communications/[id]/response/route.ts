import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** POST /api/stakeholders/communications/[id]/response — log a response to a communication */
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
  const response = String(body.response || '').trim();
  const responseDate = String(body.responseDate || '').trim();
  if (!response || !responseDate) {
    return NextResponse.json({ error: 'response_and_responseDate_required' }, { status: 400 });
  }

  try {
    const communication = await StakeholderService.logResponse(id, response, responseDate);
    if (!communication) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ communication });
  } catch (e) {
    console.error('[stakeholders/communications/response] error:', e);
    return NextResponse.json({ error: 'failed_to_log_response' }, { status: 500 });
  }
}
