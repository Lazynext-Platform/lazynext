import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PasswordPolicyService } from '@/lib/services/password-policy-service';

/** POST /api/security/password/history — check if password was used before */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (!password) {
    return NextResponse.json({ error: 'password_required' }, { status: 400 });
  }

  try {
    const used = await PasswordPolicyService.checkHistory(session.user.id, password);
    return NextResponse.json({ used });
  } catch (e) {
    console.error('[security/password/history] error:', e);
    return NextResponse.json({ error: 'failed_to_check_history' }, { status: 500 });
  }
}
