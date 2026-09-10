import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventsService } from '@/lib/services/events-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const venue = await EventsService.bookVenue(id, session.user.id);
    if (!venue) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ venue });
  } catch (e) {
    console.error('[corp-events/venues/book] error:', e);
    return NextResponse.json({ error: 'failed_to_book_venue' }, { status: 500 });
  }
}
