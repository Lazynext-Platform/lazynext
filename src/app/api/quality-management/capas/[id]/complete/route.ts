import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';

/** POST /api/quality-management/capas/[id]/complete — complete a CAPA */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const capa = await QualityManagementService.completeCAPA(id, {
      results: body.results,
      correctiveAction: body.correctiveAction,
      preventiveAction: body.preventiveAction,
    });
    if (!capa) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ capa });
  } catch (e) {
    console.error('[quality-management] complete capa error:', e);
    return NextResponse.json({ error: 'failed_to_complete_capa' }, { status: 500 });
  }
}
