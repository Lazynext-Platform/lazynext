import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityReportingService } from '@/lib/services/sustainability-reporting-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const framework = await SustainabilityReportingService.getReportingFramework(id);
  if (!framework) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ framework });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const framework = await SustainabilityReportingService.updateReportingFramework(id, body);
    if (!framework) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ framework });
  } catch (e) {
    console.error('[sustainability-reporting/reporting_framework] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_framework' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await SustainabilityReportingService.deleteReportingFramework(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
