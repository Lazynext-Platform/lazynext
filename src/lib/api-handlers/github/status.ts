import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * GET /api/github/status — get GitHub connection status.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const status = await GitHubService.getStatus(session.user.id);
    return NextResponse.json(status);
  } catch (e) {
    console.error('[github/status] error:', e);
    return NextResponse.json({ error: 'failed_to_get_status' }, { status: 500 });
  }
}
