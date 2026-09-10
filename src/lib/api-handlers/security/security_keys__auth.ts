import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityKeyService } from '@/lib/services/security-key-service';

/** POST /api/security/security-keys/auth — start WebAuthn authentication */
export async function POST() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const challenge = await SecurityKeyService.generateAuthChallenge(session.user.id);
    return NextResponse.json(challenge);
  } catch (e) {
    console.error('[security/security-keys/auth] error:', e);
    return NextResponse.json({ error: 'failed_to_start_auth' }, { status: 500 });
  }
}
