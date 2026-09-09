import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventsService } from '@/lib/services/events-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const registration = await EventsService.getRegistration(id);
  if (!registration) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ registration });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const registration = await EventsService.updateRegistration(id, {
      attendeeName: body.attendeeName, attendeeEmail: body.attendeeEmail,
      attendeePhone: body.attendeePhone, company: body.company, jobTitle: body.jobTitle,
      dietaryRequirements: body.dietaryRequirements, status: body.status,
    });
    if (!registration) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ registration });
  } catch (e) {
    console.error('[corp-events/registrations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_registration' }, { status: 500 });
  }
}
