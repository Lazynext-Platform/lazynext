import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/mentions/[id] — get a single mention */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const mention = await CommunicationsService.getMention(id);
  if (!mention) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ mention });
}

/** PATCH /api/communications/mentions/[id] — update a mention */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const mention = await CommunicationsService.updateMention(id, {
      source: body.source, outlet: body.outlet, title: body.title, url: body.url,
      sentiment: body.sentiment, reach: body.reach, date: body.date,
      author: body.author, summary: body.summary, tags: body.tags,
    });
    if (!mention) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ mention });
  } catch (e) {
    console.error('[communications/mentions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_mention' }, { status: 500 });
  }
}

/** DELETE /api/communications/mentions/[id] — delete a mention */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await CommunicationsService.deleteMention(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[communications/mentions] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_mention' }, { status: 500 });
  }
}
