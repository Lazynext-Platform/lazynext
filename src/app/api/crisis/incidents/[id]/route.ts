import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisService } from '@/lib/services/crisis-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const incident = await CrisisService.getIncident(id);
  if (!incident) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ incident });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const incident = await CrisisService.updateIncident(id, {
      title: body.title, crisisType: body.crisisType, severity: body.severity,
      description: body.description, affectedSystems: body.affectedSystems,
      affectedDepartments: body.affectedDepartments, impactAssessment: body.impactAssessment,
      status: body.status, planId: body.planId, estimatedCost: body.estimatedCost,
      estimatedDowntime: body.estimatedDowntime,
    });
    if (!incident) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[crisis/incidents] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_incident' }, { status: 500 });
  }
}
