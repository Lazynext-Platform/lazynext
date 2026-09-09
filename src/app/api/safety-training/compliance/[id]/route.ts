import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SafetyTrainingService } from '@/lib/services/safety-training-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const compliance = await SafetyTrainingService.getTrainingCompliance(id);
  if (!compliance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ compliance });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const compliance = await SafetyTrainingService.updateTrainingCompliance(id, body);
    if (!compliance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ compliance });
  } catch (e) {
    console.error('[safety-training/compliance] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_compliance' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await SafetyTrainingService.deleteTrainingCompliance(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
