import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/inspections/[id] — get a single inspection */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const inspection = await HealthSafetyService.getInspection(id);
  if (!inspection) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ inspection });
}

/** PATCH /api/health-safety/inspections/[id] — update an inspection */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const inspection = await HealthSafetyService.updateInspection(id, {
      title: body.title, area: body.area, inspector: body.inspector, date: body.date,
      items: body.items, status: body.status,
    });
    if (!inspection) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ inspection });
  } catch (e) {
    console.error('[health-safety/inspections] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_inspection' }, { status: 500 });
  }
}
