import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** GET /api/stakeholders/sentiments — list sentiments */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ sentiments: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { stakeholderId?: string; sentiment?: string } = {};
  const stakeholderId = url.searchParams.get('stakeholderId');
  const sentiment = url.searchParams.get('sentiment');
  if (stakeholderId) opts.stakeholderId = stakeholderId;
  if (sentiment) opts.sentiment = sentiment;

  const sentiments = await StakeholderService.listSentiments(organizationId, opts as never);
  return NextResponse.json({ sentiments });
}

/** POST /api/stakeholders/sentiments — create a sentiment */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const stakeholderId = String(body.stakeholderId || '').trim();
  const sentiment = String(body.sentiment || '').trim();
  const date = String(body.date || '').trim();
  if (!stakeholderId || !sentiment || !date) {
    return NextResponse.json({ error: 'stakeholderId_sentiment_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const sentimentRecord = await StakeholderService.createSentiment(
      ws.organizationId, ws.id,
      {
        stakeholderId, sentiment: sentiment as never, date,
        score: body.score, reason: body.reason, trend: body.trend, recordedBy: body.recordedBy,
      },
      session.user.id,
    );
    return NextResponse.json({ sentiment: sentimentRecord }, { status: 201 });
  } catch (e) {
    console.error('[stakeholders/sentiments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_sentiment' }, { status: 500 });
  }
}
