import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SafetyIncidentService } from '@/lib/services/safety-incident-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const rca = await SafetyIncidentService.getRootCauseAnalysis(id);
  if (!rca) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ rca });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const rca = await SafetyIncidentService.updateRootCauseAnalysis(id, body);
    if (!rca) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ rca });
  } catch (e) {
    console.error('[safety-incident/rcas] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_rca' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await SafetyIncidentService.deleteRootCauseAnalysis(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
