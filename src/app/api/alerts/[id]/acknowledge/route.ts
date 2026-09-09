import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AlertService } from '@/lib/services/alert-service';

/**
 * POST /api/alerts/[id]/acknowledge — acknowledge an alert.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userId = body.userId?.trim() || session.user.id;

  try {
    const existing = await AlertService.getAlert(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const alert = await AlertService.acknowledgeAlert(id, userId);
    return NextResponse.json({ alert });
  } catch (e) {
    console.error('[alerts] acknowledge error:', e);
    return NextResponse.json({ error: 'failed_to_acknowledge_alert' }, { status: 500 });
  }
}
