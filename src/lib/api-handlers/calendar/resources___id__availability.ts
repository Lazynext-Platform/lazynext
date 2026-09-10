import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarResourceService } from '@/lib/services/calendar-resource-service';

/** GET /api/calendar/resources/[id]/availability — get resource availability */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const startStr = sp.get('startDate');
  const endStr = sp.get('endDate');
  if (!startStr || !endStr) {
    return NextResponse.json({ error: 'start_end_required' }, { status: 400 });
  }

  const availability = await CalendarResourceService.getAvailability(
    id,
    new Date(startStr),
    new Date(endStr),
  );

  return NextResponse.json(availability);
}
