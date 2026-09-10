import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GdprService } from '@/lib/services/gdpr-service';

/** POST /api/data/gdpr/export — export all data for a user */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || session.user.id);

  try {
    const data = await GdprService.exportUserData(userId);
    return NextResponse.json({ export: data });
  } catch (e) {
    console.error('[data/gdpr/export] error:', e);
    return NextResponse.json({ error: 'failed_to_export' }, { status: 500 });
  }
}
