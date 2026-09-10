import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const report = await GHGEmissionsManagementService.getGHGReport(id);
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ report });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const report = await GHGEmissionsManagementService.updateGHGReport(id, body);
    if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[ghg-emissions-management/reports] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_report' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await GHGEmissionsManagementService.deleteGHGReport(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
