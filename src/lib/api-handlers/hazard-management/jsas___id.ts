import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HazardManagementService } from '@/lib/services/hazard-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const jsa = await HazardManagementService.getJobSafetyAnalysis(id);
  if (!jsa) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ jsa });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const jsa = await HazardManagementService.updateJobSafetyAnalysis(id, body);
    if (!jsa) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ jsa });
  } catch (e) {
    console.error('[hazard-management/jsas] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_jsa' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await HazardManagementService.deleteJobSafetyAnalysis(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
