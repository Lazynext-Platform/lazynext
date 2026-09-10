import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/submissions/[id]/response — log a response */
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
  const response = String(body.response || '').trim();
  const responseDate = String(body.responseDate || '').trim();
  if (!response || !responseDate) {
    return NextResponse.json({ error: 'response_and_responseDate_required' }, { status: 400 });
  }

  try {
    const submission = await RegulatoryService.logResponse(id, response, responseDate);
    if (!submission) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ submission });
  } catch (e) {
    console.error('[regulatory/submissions] response error:', e);
    return NextResponse.json({ error: 'failed_to_log_response' }, { status: 500 });
  }
}
