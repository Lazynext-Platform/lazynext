import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * POST /api/github/connect — connect a GitHub account with a personal access token.
 * Body: { token: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: 'token_required' }, { status: 400 });
  }

  try {
    const result = await GitHubService.connect(session.user.id, token);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, username: result.username });
  } catch (e) {
    console.error('[github/connect] error:', e);
    return NextResponse.json({ ok: false, error: 'failed_to_connect' }, { status: 500 });
  }
}
