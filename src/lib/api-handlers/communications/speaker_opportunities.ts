import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/speaker-opportunities — list speaker opportunities */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ speakerOpportunities: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; speaker?: string } = {};
  const status = url.searchParams.get('status');
  const speaker = url.searchParams.get('speaker');
  if (status) opts.status = status;
  if (speaker) opts.speaker = speaker;

  const speakerOpportunities = await CommunicationsService.listSpeakerOpportunities(organizationId, opts as never);
  return NextResponse.json({ speakerOpportunities });
}

/** POST /api/communications/speaker-opportunities — create a speaker opportunity */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const event = String(body.event || '').trim();
  const date = String(body.date || '').trim();
  const status = String(body.status || '').trim();
  if (!event || !date || !status) {
    return NextResponse.json({ error: 'event_date_status_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const speakerOpportunity = await CommunicationsService.createSpeakerOpportunity(
      ws.organizationId, ws.id,
      {
        event, date, location: body.location, audience: body.audience,
        topic: body.topic, speaker: body.speaker, status: status as never,
        deadline: body.deadline, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ speakerOpportunity }, { status: 201 });
  } catch (e) {
    console.error('[communications/speaker-opportunities] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_speaker_opportunity' }, { status: 500 });
  }
}
