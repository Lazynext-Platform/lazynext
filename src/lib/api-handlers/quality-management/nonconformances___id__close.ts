import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';

/** POST /api/quality-management/nonconformances/[id]/close — close a nonconformance */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const resolution = String(body.resolution || '').trim();
  if (!resolution) {
    return NextResponse.json({ error: 'resolution_required' }, { status: 400 });
  }

  try {
    const nonconformance = await QualityManagementService.closeNonconformance(id, resolution);
    if (!nonconformance) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ nonconformance });
  } catch (e) {
    console.error('[quality-management] close nonconformance error:', e);
    return NextResponse.json({ error: 'failed_to_close_nonconformance' }, { status: 500 });
  }
}
