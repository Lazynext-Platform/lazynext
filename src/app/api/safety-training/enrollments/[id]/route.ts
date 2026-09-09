import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SafetyTrainingService } from '@/lib/services/safety-training-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const enrollment = await SafetyTrainingService.getTrainingEnrollment(id);
  if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ enrollment });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const enrollment = await SafetyTrainingService.updateTrainingEnrollment(id, body);
    if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ enrollment });
  } catch (e) {
    console.error('[safety-training/enrollments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_enrollment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await SafetyTrainingService.deleteTrainingEnrollment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
