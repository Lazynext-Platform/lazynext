import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GdprService } from '@/lib/services/gdpr-service';

/** POST /api/data/gdpr/anonymize — anonymize user data */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || session.user.id);

  try {
    const result = await GdprService.anonymizeUserData(userId);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[data/gdpr/anonymize] error:', e);
    return NextResponse.json({ error: 'failed_to_anonymize' }, { status: 500 });
  }
}
