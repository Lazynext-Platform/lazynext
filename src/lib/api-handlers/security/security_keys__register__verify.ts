import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityKeyService } from '@/lib/services/security-key-service';

/** POST /api/security/security-keys/register/verify — verify WebAuthn registration */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const result = await SecurityKeyService.verifyRegistration(session.user.id, {
      credentialId: String(body.credentialId || ''),
      publicKey: String(body.publicKey || ''),
      attestationObject: body.attestationObject,
      clientDataJSON: body.clientDataJSON,
      name: body.name,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed_to_verify_registration';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
