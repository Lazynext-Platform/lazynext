import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/mentions — list mentions */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ mentions: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { sentiment?: string; source?: string; outlet?: string } = {};
  const sentiment = url.searchParams.get('sentiment');
  const source = url.searchParams.get('source');
  const outlet = url.searchParams.get('outlet');
  if (sentiment) opts.sentiment = sentiment;
  if (source) opts.source = source;
  if (outlet) opts.outlet = outlet;

  const mentions = await CommunicationsService.listMentions(organizationId, opts as never);
  return NextResponse.json({ mentions });
}

/** POST /api/communications/mentions — create a mention */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const source = String(body.source || '').trim();
  const outlet = String(body.outlet || '').trim();
  const title = String(body.title || '').trim();
  const sentiment = String(body.sentiment || '').trim();
  const date = String(body.date || '').trim();
  if (!source || !outlet || !title || !sentiment || !date) {
    return NextResponse.json({ error: 'source_outlet_title_sentiment_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const mention = await CommunicationsService.createMention(
      ws.organizationId, ws.id,
      {
        source: source as never, outlet, title, url: body.url,
        sentiment: sentiment as never, reach: body.reach, date,
        author: body.author, summary: body.summary, tags: body.tags,
      },
      session.user.id,
    );
    return NextResponse.json({ mention }, { status: 201 });
  } catch (e) {
    console.error('[communications/mentions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_mention' }, { status: 500 });
  }
}
