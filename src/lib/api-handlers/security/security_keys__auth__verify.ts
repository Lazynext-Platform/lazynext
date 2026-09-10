import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityKeyService } from '@/lib/services/security-key-service';

/** POST /api/security/security-keys/auth/verify — verify WebAuthn authentication */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const result = await SecurityKeyService.verifyAuth(session.user.id, {
      credentialId: String(body.credentialId || ''),
      authenticatorData: body.authenticatorData,
      clientDataJSON: body.clientDataJSON,
      signature: body.signature,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed_to_verify_auth';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
