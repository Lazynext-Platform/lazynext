import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** POST /api/document-management/esign/[id]/sign — sign a document */
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
  const signerEmail = String(body.signerEmail || '').trim();
  const signature = String(body.signature || '').trim();
  if (!signerEmail || !signature) {
    return NextResponse.json({ error: 'signerEmail_and_signature_required' }, { status: 400 });
  }

  try {
    const result = await DocumentManagementService.signDocument(id, {
      signerEmail,
      signature,
      signedAt: body.signedAt,
    });
    return NextResponse.json({ signature: result.signature, request: result.request });
  } catch (e) {
    console.error('[document-management/esign/sign] error:', e);
    return NextResponse.json({ error: 'failed_to_sign_document' }, { status: 500 });
  }
}
