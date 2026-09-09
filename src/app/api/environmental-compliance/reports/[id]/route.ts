import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EnvironmentalComplianceService } from '@/lib/services/environmental-compliance-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const report = await EnvironmentalComplianceService.getReport(id);
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ report });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const report = await EnvironmentalComplianceService.updateReport(id, body);
    if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[environmental-compliance/reports] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_report' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await EnvironmentalComplianceService.deleteReport(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
