import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PasswordPolicyService } from '@/lib/services/password-policy-service';

/** POST /api/security/password/validate — validate a password against policy */
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
    const result = PasswordPolicyService.validate(password);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[security/password/validate] error:', e);
    return NextResponse.json({ error: 'failed_to_validate_password' }, { status: 500 });
  }
}
