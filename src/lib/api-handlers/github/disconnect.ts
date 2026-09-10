import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * POST /api/github/disconnect — disconnect the GitHub account.
 */
export async function POST() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await GitHubService.disconnect(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[github/disconnect] error:', e);
    return NextResponse.json({ error: 'failed_to_disconnect' }, { status: 500 });
  }
}
