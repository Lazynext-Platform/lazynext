import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityKeyService } from '@/lib/services/security-key-service';

/** GET /api/security/security-keys — list registered security keys */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const keys = await SecurityKeyService.listKeys(session.user.id);
    return NextResponse.json({ keys });
  } catch (e) {
    console.error('[security/security-keys] error:', e);
    return NextResponse.json({ error: 'failed_to_list_keys' }, { status: 500 });
  }
}
