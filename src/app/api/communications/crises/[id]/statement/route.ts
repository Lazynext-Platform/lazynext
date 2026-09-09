import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** POST /api/communications/crises/[id]/statement — add a statement to a crisis */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const date = String(body.date || '').trim();
  const channel = String(body.channel || '').trim();
  const content = String(body.content || '').trim();
  if (!date || !channel || !content) {
    return NextResponse.json({ error: 'date_channel_content_required' }, { status: 400 });
  }

  try {
    const crisis = await CommunicationsService.addStatement(id, { date, channel, content }, session.user.id);
    if (!crisis) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ crisis });
  } catch (e) {
    console.error('[communications/crises/statement] error:', e);
    return NextResponse.json({ error: 'failed_to_add_statement' }, { status: 500 });
  }
}
