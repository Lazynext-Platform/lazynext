import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TwoFactorService } from '@/lib/services/two-factor-service';

/** GET /api/security/2fa/backup-codes — list remaining backup codes */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const codes = await TwoFactorService.getBackupCodes(session.user.id);
    return NextResponse.json({ codes });
  } catch (e) {
    console.error('[security/2fa/backup-codes] error:', e);
    return NextResponse.json({ error: 'failed_to_get_backup_codes' }, { status: 500 });
  }
}

/** POST /api/security/2fa/backup-codes — regenerate backup codes */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim();
  if (!code) {
    return NextResponse.json({ error: 'code_required' }, { status: 400 });
  }

  try {
    const codes = await TwoFactorService.regenerateBackupCodes(session.user.id, code);
    return NextResponse.json({ codes });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed_to_regenerate_backup_codes';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
