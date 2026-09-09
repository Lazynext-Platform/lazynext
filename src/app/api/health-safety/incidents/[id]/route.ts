import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/incidents/[id] — get a single incident */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const incident = await HealthSafetyService.getIncident(id);
  if (!incident) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ incident });
}

/** PATCH /api/health-safety/incidents/[id] — update an incident */
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
    const incident = await HealthSafetyService.updateIncident(id, {
      title: body.title, description: body.description, type: body.type, severity: body.severity,
      location: body.location, occurredAt: body.occurredAt, reportedBy: body.reportedBy,
      involvedPersons: body.involvedPersons, status: body.status,
    });
    if (!incident) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[health-safety/incidents] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_incident' }, { status: 500 });
  }
}
