import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** POST /api/document-management/esign/[id]/cancel — cancel an e-sign request */
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
  const reason = String(body.reason || '');

  try {
    const request = await DocumentManagementService.cancelESignRequest(id, reason);
    if (!request) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[document-management/esign/cancel] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_esign_request' }, { status: 500 });
  }
}
