import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';

/** POST /api/quality-management/capas/[id]/verify — verify a CAPA */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved;

  try {
    const capa = await QualityManagementService.verifyCAPA(id, userId);
    if (!capa) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ capa });
  } catch (e) {
    console.error('[quality-management] verify capa error:', e);
    return NextResponse.json({ error: 'failed_to_verify_capa' }, { status: 500 });
  }
}
