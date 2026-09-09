import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarResourceService } from '@/lib/services/calendar-resource-service';

/** GET /api/calendar/resources/[id]/bookings — get bookings for a resource */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const sp = req.nextUrl.searchParams;

  const bookings = await CalendarResourceService.getBookings(id, {
    startDate: sp.get('startDate') ? new Date(sp.get('startDate')!) : undefined,
    endDate: sp.get('endDate') ? new Date(sp.get('endDate')!) : undefined,
    status: sp.get('status') || undefined,
  });

  return NextResponse.json({ bookings });
}
