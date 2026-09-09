import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SafetyIncidentService } from '@/lib/services/safety-incident-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const incident = await SafetyIncidentService.getSafetyIncident(id);
  if (!incident) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ incident });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const incident = await SafetyIncidentService.updateSafetyIncident(id, body);
    if (!incident) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[safety-incident/incidents] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_incident' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await SafetyIncidentService.deleteSafetyIncident(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
