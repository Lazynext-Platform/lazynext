import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AlertService } from '@/lib/services/alert-service';

/**
 * POST /api/alerts/[id]/resolve — manually resolve an alert.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await AlertService.getAlert(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const alert = await AlertService.resolveAlert(id);
    return NextResponse.json({ alert });
  } catch (e) {
    console.error('[alerts] resolve error:', e);
    return NextResponse.json({ error: 'failed_to_resolve_alert' }, { status: 500 });
  }
}
