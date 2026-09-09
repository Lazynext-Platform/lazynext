import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventsService } from '@/lib/services/events-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const speaker = await EventsService.getSpeaker(id);
  if (!speaker) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ speaker });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const speaker = await EventsService.updateSpeaker(id, {
      name: body.name, title: body.title, bio: body.bio, company: body.company,
      email: body.email, phone: body.phone, photoUrl: body.photoUrl, topic: body.topic,
      status: body.status, presentationTitle: body.presentationTitle, presentationDuration: body.presentationDuration,
    });
    if (!speaker) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ speaker });
  } catch (e) {
    console.error('[corp-events/speakers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_speaker' }, { status: 500 });
  }
}
