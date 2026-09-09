import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisService } from '@/lib/services/crisis-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const plan = await CrisisService.getPlan(id);
  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const plan = await CrisisService.updatePlan(id, {
      name: body.name, crisisType: body.crisisType, description: body.description,
      severityThreshold: body.severityThreshold, responseSteps: body.responseSteps,
      escalationMatrix: body.escalationMatrix, communicationProtocol: body.communicationProtocol,
      resourceList: body.resourceList, recoverySteps: body.recoverySteps, status: body.status,
      approvedBy: body.approvedBy, approvedDate: body.approvedDate, version: body.version, lastReviewed: body.lastReviewed,
    });
    if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[crisis/plans] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_plan' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CrisisService.deletePlan(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
