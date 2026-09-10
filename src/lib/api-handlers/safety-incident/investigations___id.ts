import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SafetyIncidentService } from '@/lib/services/safety-incident-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const investigation = await SafetyIncidentService.getIncidentInvestigation(id);
  if (!investigation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ investigation });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const investigation = await SafetyIncidentService.updateIncidentInvestigation(id, body);
    if (!investigation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ investigation });
  } catch (e) {
    console.error('[safety-incident/investigations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_investigation' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await SafetyIncidentService.deleteIncidentInvestigation(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
