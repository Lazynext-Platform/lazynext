import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const assignment = await AssetTrackingService.getAssignment(id);
  if (!assignment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ assignment });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const assignment = await AssetTrackingService.updateAssignment(id, body);
    if (!assignment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ assignment });
  } catch (e) {
    console.error('[asset-tracking/assignments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_assignment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await AssetTrackingService.deleteAssignment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
