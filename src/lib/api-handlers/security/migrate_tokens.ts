import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityService } from '@/lib/services/security';

/**
 * POST /api/security/migrate-tokens — migrate all plaintext tokens for the
 * authenticated user to encrypted form.
 */
export async function POST() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await SecurityService.migrateAllTokens(session.user.id);
    return NextResponse.json({ result });
  } catch (e) {
    console.error('[security/migrate-tokens] error:', e);
    return NextResponse.json({ error: 'failed_to_migrate_tokens' }, { status: 500 });
  }
}
